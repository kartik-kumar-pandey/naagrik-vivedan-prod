# Model Setup Instructions

## Overview
The backend now uses a MobileNetV3 model with CBAM attention mechanism for classifying civic issues into 6 categories:
1. **damaged_signs** → Traffic Department
2. **fallen_trees** → Public Works
3. **garbage** → Sanitation
4. **graffiti** → Public Works
5. **illegal_parking** → Traffic Department
6. **potholes** → Public Works

## Setup Steps

### 1. Install Dependencies
Make sure you have PyTorch and torchvision installed:
```bash
pip install torch torchvision
```

Or install all requirements:
```bash
pip install -r requirements.txt
```

### 2. Save Your Model in Colab (IMPORTANT!)

**In your Colab notebook, after training completes, add this code:**

```python
# Save the FULL model (recommended - simpler to load)
torch.save(model, 'best_model.pth')

# Download from Colab
from google.colab import files
files.download('best_model.pth')
```

**OR if you prefer to save only weights:**
```python
# Save only weights (requires architecture code to load)
torch.save(model.state_dict(), 'best_model.pth')
files.download('best_model.pth')
```

### 3. Add Your Trained Model to Backend
1. Download the `best_model.pth` file from Colab
2. Place it in the `backend/` directory
3. The model will be automatically loaded when the Flask app starts
4. **The app will NOT start without the model file!**

### 4. Model File Location
The model file should be located at:
```
backend/best_model.pth
```

### 5. Configure Number of Classes
In `backend/app.py`, you can configure the number of classes:
- **6 classes** (default): If your model was trained with all 6 categories including `illegal_parking`
- **5 classes**: If your model was trained with only 5 categories (without `illegal_parking`)

To change, modify this line in `app.py`:
```python
classifier = IssueClassifier(model_path=model_path, num_classes=6)  # Change to 5 if needed
```

### 6. Verify Model Loading
When you start the Flask backend, you should see one of these messages:
- ✅ **Success**: You'll see `✓ Model loaded successfully` and the app will start
- ❌ **Error**: The app will NOT start and show an error message if the model file is missing

## How It Works

1. **Image Upload**: User uploads an image through the frontend
2. **Preprocessing**: Image is resized to 224x224 and converted to tensor
3. **Inference**: MobileNetV3 model classifies the image into one of 6 categories
4. **Department Assignment**: Based on the category, complaint is routed to the appropriate department
5. **Response**: Returns issue type and confidence score to the frontend

## Model Architecture
- **Base Model**: MobileNetV3 Small (pretrained on ImageNet)
- **Attention**: CBAM (Convolutional Block Attention Module)
- **Input Size**: 224x224 RGB images
- **Output**: 6 classes with confidence scores

## Troubleshooting

### Model Not Found
If you see a warning about the model file not being found:
- Check that `best_model.pth` is in the `backend/` directory
- Verify the file name is exactly `best_model.pth`
- Check file permissions

### CUDA/GPU Issues
- The model will automatically use CPU if CUDA is not available
- For production, CPU inference is sufficient for single image classification
- GPU is only needed for training, not inference

### Import Errors
If you get import errors for torch or torchvision:
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
```

## Testing
You can test the model by:
1. Starting the Flask backend: `python backend/app.py`
2. Uploading an image through the frontend
3. Checking the console output for classification results

