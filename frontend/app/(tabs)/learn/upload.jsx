import { View, Text, TextInput, TouchableOpacity, Alert, RefreshControl, ScrollView } from 'react-native';
import React, { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Video } from 'expo-av';
import axios from 'axios';

const Upload = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [video, setVideo] = useState(null);
  const [duration, setDuration] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Reset form
    setTitle('');
    setDescription('');
    setVideo(null);
    setDuration(0);
    setUploadProgress(0);
    setRefreshing(false);
  }, []);

  const calculateDuration = async (videoUri) => {
    try {
      const videoObject = await Video.createAsync(
        { uri: videoUri },
        { shouldPlay: false }
      );
      const durationSeconds = Math.round(videoObject.status.durationMillis / 1000);
      setDuration(durationSeconds);
      return durationSeconds;
    } catch (error) {
      console.log('Error calculating duration:', error);
      return 0;
    }
  };

  const pickVideo = async () => {
    try {
      Alert.alert(
        "Choose Video Source",
        "Would you like to record a new video or choose from library?",
        [
          {
            text: "Record Video",
            onPress: async () => {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Sorry, we need camera permissions to record video!');
                return;
              }
              
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: true,
                quality: 1,
                videoMaxDuration: 600, // 10 minutes max
              });
  
              if (!result.canceled) {
                setVideo(result.assets[0]);
                await calculateDuration(result.assets[0].uri);
                Alert.alert('Success', 'Video recorded successfully');
              }
            }
          },
          {
            text: "Choose from Library",
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: true,
                quality: 1,
              });
  
              if (!result.canceled) {
                setVideo(result.assets[0]);
                await calculateDuration(result.assets[0].uri);
                Alert.alert('Success', 'Video selected successfully');
              }
            }
          },
          {
            text: "Cancel",
            style: "cancel"
          }
        ]
      );
    } catch (error) {
      console.log('Video handling failed:', error);
      Alert.alert('Error', 'Failed to handle video');
    }
  };

  const handleSubmit = async () => {
    if (!title || !description || !video) {
      Alert.alert('Error', 'Please fill all fields and upload a video');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Get file extension from URI
      const fileExtension = video.uri.split('.').pop();
      const fileName = `video-${Date.now()}.${fileExtension}`;

      const formData = new FormData();
      formData.append('video', {
        uri: video.uri,
        type: video.mimeType || 'video/mp4',
        name: fileName
      });
      formData.append('title', title);
      formData.append('description', description);
      formData.append('duration', duration.toString());

      const response = await axios.post('http://localhost:8000/videos/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(progress);
        },
      });

      if (response.data.success) {
        Alert.alert('Success', 'Video uploaded successfully');
        setTitle('');
        setDescription('');
        setVideo(null);
        setDuration(0);
      }
    } catch (error) {
      console.error('Upload error:', error.response?.data || error.message);
      Alert.alert(
        'Error', 
        error.response?.data?.message || 'Failed to upload video'
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <LinearGradient
        colors={['#0f1924', '#182635']}
        className="p-5"
      >
        <Text className="text-2xl font-pbold text-white text-center">
          Upload Educational Video
        </Text>
        <Text className="text-base text-gray-400 text-center mt-1 font-pregular">
          Share your farming knowledge
        </Text>
      </LinearGradient>

      <ScrollView 
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffffff"
            colors={['#ffffff']}
          />
        }
      >
        <View className="p-6">
          <View className="mb-6">
            <Text className="text-white font-pmedium mb-2">Title</Text>
            <TextInput
              className="bg-surface p-4 rounded-lg text-white font-pregular"
              placeholder="Enter video title"
              placeholderTextColor="#8b9eb5"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View className="mb-6">
            <Text className="text-white font-pmedium mb-2">Description</Text>
            <TextInput
              className="bg-surface p-4 rounded-lg text-white font-pregular h-32"
              placeholder="Enter video description"
              placeholderTextColor="#8b9eb5"
              multiline
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <TouchableOpacity
            className="bg-surface p-4 rounded-lg mb-6 border-2 border-dashed border-primary"
            onPress={pickVideo}
            disabled={isUploading}
          >
            <Text className="text-primary text-center font-pmedium">
              {video ? 'Video Selected' : 'Upload Video'}
            </Text>
          </TouchableOpacity>

          {isUploading && (
            <View className="mb-6">
              <Text className="text-white text-center">
                Uploading: {uploadProgress}%
              </Text>
            </View>
          )}

          <TouchableOpacity
            className="bg-primary py-4 rounded-lg"
            onPress={handleSubmit}
            disabled={isUploading}
          >
            <Text className="text-white text-center font-pbold text-lg">
              {isUploading ? 'Uploading...' : 'Submit'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Upload;