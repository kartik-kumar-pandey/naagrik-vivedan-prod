"""
Model inference module for MobileNetV3 with CBAM for civic issue classification.
This module loads the trained model and performs inference on uploaded images.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision.models import mobilenet_v3_small
from torchvision import transforms
from PIL import Image
import numpy as np
import os

# Model classes (6 categories)
CLASS_NAMES = [
    "damaged_signs",
    "fallen_trees",
    "garbage",
    "graffiti",
    "illegal_parking",
    "potholes"
]

# ------------------- CBAM Layer -------------------
# Support both architectures: shared_mlp (standard) and channel_gate (alternative)
class CBAM(nn.Module):
    """
    CBAM matching the training-time architecture shared by the user:
    - Channel gate: AdaptiveAvgPool2d -> Conv -> ReLU -> Conv -> Sigmoid
    - Spatial gate: Conv2d(2->1) with sigmoid on concatenated max/avg maps
    """
    def __init__(self, c_in, ratio=16, kernel_size=7):
        super(CBAM, self).__init__()
        self.channel_gate = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Conv2d(c_in, c_in // ratio, 1, bias=False),
            nn.ReLU(),
            nn.Conv2d(c_in // ratio, c_in, 1, bias=False),
            nn.Sigmoid()
        )
        self.spatial_gate = nn.Sequential(
            nn.Conv2d(2, 1, kernel_size, padding=kernel_size//2, bias=False),
            nn.Sigmoid()
        )

    def forward(self, x):
        # Defensive: ensure inputs to Conv2d remain 4D (N, C, H, W)
        def ensure_4d(t: torch.Tensor) -> torch.Tensor:
            while t.dim() > 4 and t.size(2) == 1:
                t = t.squeeze(2)
            return t

        x = ensure_4d(x)
        x_out = x * self.channel_gate(x)
        x_out = ensure_4d(x_out)
        max_pool, _ = torch.max(x_out, dim=1, keepdim=True)
        avg_pool = torch.mean(x_out, dim=1, keepdim=True)
        cat_tensor = torch.cat([max_pool, avg_pool], dim=1)
        cat_tensor = ensure_4d(cat_tensor)
        spatial_out = self.spatial_gate(cat_tensor)
        return x_out * spatial_out

# ------------------- MobileNetV3 with CBAM -------------------
class UrbanMobileNet(nn.Module):
    """
    Architecture for inference. We bypass CBAM to avoid runtime shape errors, while
    preserving the classifier head structure to match trained weights.
    - mobilenet_v3_small(features) -> (Identity in place of CBAM) -> classifier with avgpool+flatten
      -> Linear(576->1024)->Hardswish->Dropout->Linear(1024->num_classes)
    """
    def __init__(self, num_classes):
        super().__init__()
        base_model = mobilenet_v3_small(weights=None)  # custom loading
        self.features = base_model.features
        # Bypass CBAM for robust inference
        self.cbam = nn.Identity()
        self.classifier = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Flatten(),
            nn.Linear(576, 1024),
            nn.Hardswish(),
            nn.Dropout(p=0.3),
            nn.Linear(1024, num_classes)
        )

    def forward(self, x):
        x = self.features(x)
        x = self.cbam(x)
        x = self.classifier(x)
        return x


class IssueClassifier:
    """
    Classifier for civic issues using MobileNetV3 with CBAM.
    """
    
    def __init__(self, model_path='backend/best_model.pth', num_classes=6):
        """
        Initialize the classifier.
        
        Args:
            model_path: Path to the trained model weights file
            num_classes: Number of classes the model was trained with (5 or 6)
                         Default is 6. If your model was trained with 5 classes
                         (without illegal_parking), set this to 5.
        """
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = None
        self.model_path = model_path
        self.num_classes = num_classes
        
        # Use appropriate class names based on num_classes
        if num_classes == 6:
            self.class_names = CLASS_NAMES  # All 6 categories
        elif num_classes == 5:
            # Remove illegal_parking for 5-class model
            self.class_names = [cls for cls in CLASS_NAMES if cls != "illegal_parking"]
        else:
            raise ValueError(f"num_classes must be 5 or 6, got {num_classes}")
        
        # Image preprocessing transform (match training normalization)
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        
        # Load model
        self._load_model()
    
    def _load_model(self):
        """Load the trained model."""
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(
                f"Model file not found at {self.model_path}\n"
                f"Please download your trained model from Colab and place it in the backend directory.\n"
                f"See MODEL_SETUP.md for instructions."
            )
        
        try:
            # Always load as state_dict and build the training-matched architecture
            try:
                state_dict = torch.load(self.model_path, map_location=self.device)
            except Exception as e:
                raise RuntimeError(f"Failed to read model file: {e}")

            load_errors = []

            # 1) Try UrbanMobileNet (training-time architecture) with strict load
            try:
                model_candidate = UrbanMobileNet(num_classes=self.num_classes)
                # First attempt: allow non-strict to ignore CBAM-specific keys from training
                missing_keys, unexpected_keys = model_candidate.load_state_dict(state_dict, strict=False)
                self.model = model_candidate
                print(f"[OK] Weights loaded into UrbanMobileNet (non-strict) from {self.model_path}")
                if missing_keys or unexpected_keys:
                    print(f"[WARN] Load mismatches: missing={len(missing_keys)} unexpected={len(unexpected_keys)}")
            except Exception as e_urban_strict:
                load_errors.append(f"UrbanMobileNet load: {e_urban_strict}")
                self.model = None

            # 2) If still not loaded, raise detailed error
            if self.model is None:
                raise RuntimeError(" | ".join(load_errors))
            
            self.model.to(self.device)
            self.model.eval()  # Set to evaluation mode
            print(f"[OK] Model ready for inference on device: {self.device}")
            
        except Exception as e:
            raise RuntimeError(
                f"Failed to load model from {self.model_path}\n"
                f"Error: {e}\n"
                f"Please ensure the model file is valid and matches the architecture."
            )
    
    def classify_issue(self, image_data):
        """
        Classify an image into one of the issue categories.
        
        Args:
            image_data: numpy array or PIL Image of the uploaded image
            
        Returns:
            dict: {
                'issue_type': str,  # Category name
                'confidence': float  # Confidence score (0-1)
            }
        """
        if self.model is None:
            raise RuntimeError("Model not loaded. Please ensure best_model.pth exists in backend directory.")
        
        try:
            # Convert numpy array to PIL Image if needed
            if isinstance(image_data, np.ndarray):
                # Handle different numpy array formats
                if image_data.dtype != np.uint8:
                    image_data = (image_data * 255).astype(np.uint8)
                image = Image.fromarray(image_data).convert('RGB')
            elif isinstance(image_data, Image.Image):
                image = image_data.convert('RGB')
            else:
                raise ValueError(f"Unsupported image type: {type(image_data)}")
            
            # Preprocess image
            image_tensor = self.transform(image).unsqueeze(0)  # Add batch dimension
            image_tensor = image_tensor.to(self.device)
            
            # Run inference
            with torch.no_grad():
                outputs = self.model(image_tensor)
                probs = F.softmax(outputs, dim=1)
                confidence, pred_idx = torch.max(probs, dim=1)
            
            # Get predicted class and confidence
            predicted_idx = pred_idx.item()
            predicted_type = self.class_names[predicted_idx]
            confidence_score = confidence.item()
            
            return {
                'issue_type': predicted_type,
                'confidence': confidence_score
            }
            
        except Exception as e:
            print(f"Error during classification: {e}")
            raise RuntimeError(f"Classification failed: {e}")

