import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  View,
  Dimensions,
  Alert,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import {captureRef} from 'react-native-view-shot';

const {width: screenWidth} = Dimensions.get('window');

const ImageCropper = ({
  imageUri,
  fileId,
  onCropComplete,
  containerWidth = screenWidth * 0.9,
}) => {
  // Calculate container dimensions with 3:4 ratio
  const cropWidth = containerWidth;
  const cropHeight = (containerWidth * 4) / 3;

  // Refs
  const cropViewRef = useRef();

  // Animated values
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Image dimensions state
  const [imageDimensions, setImageDimensions] = useState({width: 0, height: 0});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [cropData, setCropData] = useState({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Load crop data from storage
  useEffect(() => {
    const loadCropData = async () => {
      try {
        const storedData = await AsyncStorage.getItem('cropData');
        if (storedData) {
          setCropData(JSON.parse(storedData));
        }
      } catch (error) {
        console.error('Error loading crop data:', error);
      }
    };
    loadCropData();
  }, []);

  // Save crop data to storage
  useEffect(() => {
    const saveCropData = async () => {
      try {
        await AsyncStorage.setItem('cropData', JSON.stringify(cropData));
      } catch (error) {
        console.error('Error saving crop data:', error);
      }
    };
    if (Object.keys(cropData).length > 0) {
      saveCropData();
    }
  }, [cropData]);

  // Initialize crop data for new files
  useEffect(() => {
    if (imageUri && fileId && !cropData[fileId]) {
      setCropData(prev => ({
        ...prev,
        [fileId]: {
          crop: {x: 0, y: 0},
          zoom: 1,
          minZoom: 1,
          translateX: 0,
          translateY: 0,
          scale: 1,
        },
      }));
    }
  }, [fileId, imageUri, cropData]);

  // Reset loading state when imageUri changes
  useEffect(() => {
    if (imageUri) {
      setIsImageLoading(true);
      setIsInitialized(false);
    }
  }, [imageUri, fileId]);

  // Function to apply saved crop state
  const applySavedCropState = useCallback(() => {
    if (cropData[fileId] && imageDimensions.width && imageDimensions.height) {
      const savedCropState = cropData[fileId];

      // Apply saved values
      scale.value = savedCropState.scale || 1;
      savedScale.value = savedCropState.scale || 1;
      translateX.value = savedCropState.translateX || 0;
      translateY.value = savedCropState.translateY || 0;
      savedTranslateX.value = savedCropState.translateX || 0;
      savedTranslateY.value = savedCropState.translateY || 0;

      console.log('Applied saved crop state:', savedCropState);
    } else {
      // Calculate initial scale to fit image in container
      const scaleX = cropWidth / imageDimensions.width;
      const scaleY = cropHeight / imageDimensions.height;
      const initialScale = Math.max(scaleX, scaleY);

      scale.value = initialScale;
      savedScale.value = initialScale;
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    }

    setIsInitialized(true);
  }, [cropData, fileId, imageDimensions, cropWidth, cropHeight]);

  // Get image dimensions when loaded
  const handleImageLoad = useCallback(event => {
    const {width, height} = event.nativeEvent.source;
    setImageDimensions({width, height});

    // Hide loading indicator
    setIsImageLoading(false);
  }, []);

  // Apply saved crop state after image loads and crop data is available
  useEffect(() => {
    if (
      !isImageLoading &&
      imageDimensions.width &&
      imageDimensions.height &&
      !isInitialized
    ) {
      applySavedCropState();
    }
  }, [isImageLoading, imageDimensions, isInitialized, applySavedCropState]);

  // Handle image load error
  const handleImageError = useCallback(() => {
    setIsImageLoading(false);
    Alert.alert('Error', 'Failed to load image');
  }, []);

  // Function to save current crop state
  const saveCropState = useCallback(() => {
    if (fileId) {
      setCropData(prev => ({
        ...prev,
        [fileId]: {
          ...prev[fileId],
          scale: scale.value,
          translateX: translateX.value,
          translateY: translateY.value,
        },
      }));
    }
  }, [fileId]);

  // Constrain translation within bounds
  const constrainTranslation = useCallback(
    (x, y, currentScale) => {
      'worklet';
      if (!imageDimensions.width || !imageDimensions.height) return {x, y};

      const scaledWidth = imageDimensions.width * currentScale;
      const scaledHeight = imageDimensions.height * currentScale;

      const maxTranslateX = Math.max(0, (scaledWidth - cropWidth) / 2);
      const maxTranslateY = Math.max(0, (scaledHeight - cropHeight) / 2);

      const constrainedX = Math.max(-maxTranslateX, Math.min(maxTranslateX, x));
      const constrainedY = Math.max(-maxTranslateY, Math.min(maxTranslateY, y));

      return {x: constrainedX, y: constrainedY};
    },
    [cropWidth, cropHeight, imageDimensions],
  );

  // Pan gesture
  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate(event => {
      const newX = savedTranslateX.value + event.translationX;
      const newY = savedTranslateY.value + event.translationY;

      translateX.value = newX;
      translateY.value = newY;
    })
    .onEnd(() => {
      const constrained = constrainTranslation(
        translateX.value,
        translateY.value,
        scale.value,
      );
      translateX.value = withSpring(constrained.x);
      translateY.value = withSpring(constrained.y);

      // Save crop state after pan ends
      runOnJS(saveCropState)();
    });

  // Pinch gesture
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate(event => {
      const newScale = savedScale.value * event.scale;

      // Limit scale between 0.5x and 5x
      if (newScale >= 0.5 && newScale <= 5) {
        scale.value = newScale;
      }
    })
    .onEnd(() => {
      // Constrain translation after scaling
      const constrained = constrainTranslation(
        translateX.value,
        translateY.value,
        scale.value,
      );
      translateX.value = withSpring(constrained.x);
      translateY.value = withSpring(constrained.y);
      scale.value = withSpring(scale.value);

      // Save crop state after pinch ends
      runOnJS(saveCropState)();
    });

  // Combine gestures
  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  // Animated style for the image
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {translateX: translateX.value},
        {translateY: translateY.value},
        {scale: scale.value},
      ],
    };
  });

  // Function to generate cropped image using view-shot
  const generateCroppedImageUrl = useCallback(async () => {
    if (!imageDimensions.width || !imageDimensions.height) {
      Alert.alert('Error', 'Image not loaded yet');
      return;
    }

    if (!cropViewRef.current) {
      Alert.alert('Error', 'Crop view not ready');
      return;
    }

    try {
      setIsGenerating(true);

      // Save current crop state before generating
      saveCropState();

      // Capture the crop container as image
      const uri = await captureRef(cropViewRef.current, {
        format: 'jpg',
        quality: 0.9,
        width: cropWidth,
        height: cropHeight,
      });

      if (onCropComplete) {
        onCropComplete(fileId, uri);
      }

      Alert.alert('Success', 'Cropped image generated successfully!');
      return uri;
    } catch (error) {
      console.error('Error generating cropped image:', error);
      Alert.alert(
        'Error',
        'Failed to generate cropped image: ' + error.message,
      );
    } finally {
      setIsGenerating(false);
    }
  }, [imageDimensions, cropWidth, cropHeight, onCropComplete, saveCropState]);

  // Reset function
  const resetTransform = useCallback(() => {
    if (!imageDimensions.width || !imageDimensions.height) return;

    const scaleX = cropWidth / imageDimensions.width;
    const scaleY = cropHeight / imageDimensions.height;
    const initialScale = Math.max(scaleX, scaleY);

    scale.value = withSpring(initialScale);
    savedScale.value = initialScale;
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;

    // Update crop data
    setCropData(prev => ({
      ...prev,
      [fileId]: {
        ...prev[fileId],
        scale: initialScale,
        translateX: 0,
        translateY: 0,
      },
    }));
  }, [cropWidth, cropHeight, imageDimensions, fileId]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <View
        ref={cropViewRef}
        style={[styles.cropContainer, {width: cropWidth, height: cropHeight}]}>
        {/* Loading indicator */}
        {(isImageLoading || !isInitialized) && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>
              {isImageLoading ? 'Loading image...' : 'Initializing...'}
            </Text>
          </View>
        )}

        <GestureDetector gesture={composedGesture}>
          <Animated.View style={styles.gestureContainer}>
            <Animated.Image
              source={{uri: imageUri}}
              style={[
                {
                  width: imageDimensions.width || cropWidth,
                  height: imageDimensions.height || cropHeight,
                  opacity: isImageLoading || !isInitialized ? 0 : 1,
                },
                animatedStyle,
              ]}
              onLoad={handleImageLoad}
              onError={handleImageError}
              resizeMode="contain"
            />
          </Animated.View>
        </GestureDetector>
      </View>

      {/* Crop overlay - positioned outside the capture area */}
      <View
        style={[styles.cropOverlay, {width: cropWidth, height: cropHeight}]}
        pointerEvents="none">
        <View style={styles.cropBorder} />
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.button,
            (isGenerating || isImageLoading || !isInitialized) &&
              styles.disabledButton,
          ]}
          onPress={resetTransform}
          disabled={isGenerating || isImageLoading || !isInitialized}>
          <Text style={styles.buttonText}>Reset</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.primaryButton,
            (isGenerating || isImageLoading || !isInitialized) &&
              styles.disabledButton,
          ]}
          onPress={generateCroppedImageUrl}
          disabled={isGenerating || isImageLoading || !isInitialized}>
          <Text style={styles.buttonText}>
            {isGenerating ? 'Generating...' : 'Generate Crop'}
          </Text>
        </TouchableOpacity>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = {
  container: {
    alignItems: 'center',
    padding: 20,
  },
  cropContainer: {
    backgroundColor: '#000',
    overflow: 'hidden',
    borderRadius: 8,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gestureContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cropOverlay: {
    position: 'absolute',
    top: 20, // Adjust based on container padding
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  cropBorder: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1,
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  controls: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  button: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
};

export default ImageCropper;
