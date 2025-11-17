import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, Upload, X, RotateCcw } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

const ImageCapture = ({ onImageCapture, onImageUpload }) => {
  const [capturedImage, setCapturedImage] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const webcamRef = useRef(null);

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "environment"
  };

  const preprocessImage = useCallback((imageSrc) => {
    return new Promise((resolve, reject) => {
      try {
        if (!imageSrc) {
          resolve(null);
          return;
        }

        const img = new Image();
        img.onload = () => {
          const MAX_SIZE = 640;
          let { width, height } = img;

          if (width > height && width > MAX_SIZE) {
            height = (height * MAX_SIZE) / width;
            width = MAX_SIZE;
          } else if (height >= width && height > MAX_SIZE) {
            width = (width * MAX_SIZE) / height;
            height = MAX_SIZE;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { alpha: false });

          ctx.drawImage(img, 0, 0, width, height);
          const processed = canvas.toDataURL('image/jpeg', 0.9);
          resolve(processed);
        };
        img.onerror = reject;
        img.src = imageSrc;
      } catch (err) {
        reject(err);
      }
    });
  }, []);

  const capture = useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) return;
    try {
      const processedImage = await preprocessImage(imageSrc);
      setCapturedImage(processedImage);
      setIsCapturing(false);
      onImageCapture(processedImage);
    } catch (error) {
      console.error('Failed to process captured image:', error);
    }
  }, [webcamRef, onImageCapture, preprocessImage]);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageSrc = e.target.result;
        try {
          const processedImage = await preprocessImage(imageSrc);
          setUploadedImage(processedImage);
          onImageUpload(processedImage);
        } catch (error) {
          console.error('Failed to process uploaded image:', error);
        }
      };
      reader.readAsDataURL(file);
    }
  }, [onImageUpload, preprocessImage]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    multiple: false
  });

  const resetImages = () => {
    setCapturedImage(null);
    setUploadedImage(null);
    setIsCapturing(false);
  };

  const startCapture = () => {
    setIsCapturing(true);
  };

  const stopCapture = () => {
    setIsCapturing(false);
  };

  return (
    <div className="space-y-6">
      {/* Image Display */}
      {(capturedImage || uploadedImage) && (
        <div className="relative">
          <img
            src={capturedImage || uploadedImage}
            alt="Captured/Uploaded"
            className="w-full max-w-md mx-auto rounded-2xl shadow-modern"
          />
          <button
            onClick={resetImages}
            className="absolute top-4 right-4 bg-gradient-to-r from-red-500 to-rose-600 text-white p-3 rounded-full hover:from-red-600 hover:to-rose-700 transition-all duration-300 shadow-lg hover:scale-110"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Camera Capture */}
      {isCapturing && (
        <div className="camera-container">
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            screenshotQuality={1}
            mirrored={false}
            videoConstraints={videoConstraints}
            className="camera-preview"
          />
          <div className="flex justify-center space-x-4 mt-4">
            <button
              onClick={capture}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all duration-300 flex items-center space-x-2 shadow-lg shadow-green-500/50 hover:scale-105"
            >
              <Camera className="w-5 h-5" />
              <span>Capture</span>
            </button>
            <button
              onClick={stopCapture}
              className="bg-gray-500 text-white px-8 py-4 rounded-xl font-bold hover:bg-gray-600 transition-all duration-300 shadow-lg hover:scale-105"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!capturedImage && !uploadedImage && !isCapturing && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Camera Button */}
          <button
            onClick={startCapture}
            className="bg-gradient-to-r from-blue-400 to-cyan-400 text-white p-8 rounded-2xl hover:from-blue-500 hover:to-cyan-500 transition-all duration-300 flex flex-col items-center space-y-3 shadow-lg shadow-blue-400/50 hover:scale-105"
          >
            <Camera className="w-10 h-10" />
            <span className="font-bold text-lg">Take Photo</span>
          </button>

          {/* Upload Area */}
          <div
            {...getRootProps()}
            className={`upload-area ${isDragActive ? 'dragover' : ''}`}
          >
            <input {...getInputProps()} />
            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-gray-600 font-medium">
              {isDragActive ? 'Drop the image here' : 'Upload Image'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Drag & drop or click to select
            </p>
          </div>
        </div>
      )}

      {/* Start Over Button */}
      {(capturedImage || uploadedImage) && !isCapturing && (
        <div className="text-center">
          <button
            onClick={resetImages}
            className="bg-white/50 backdrop-blur-sm text-gray-700 px-8 py-4 rounded-xl font-bold hover:bg-white/70 transition-all duration-300 flex items-center space-x-2 mx-auto border-2 border-gray-200 hover:scale-105"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Start Over</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageCapture;
