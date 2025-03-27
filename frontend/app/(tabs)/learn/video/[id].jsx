import React, { useState, useEffect } from 'react';
import { View, Text, Dimensions, ScrollView } from 'react-native';
import { Video } from 'expo-av';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';

const VideoPlayer = () => {
  const { id } = useLocalSearchParams();
  const [error, setError] = useState(null);
  const [videoData, setVideoData] = useState(null);
  const videoUrl = `http://localhost:8000/videos/stream/${id}`;
  const screenHeight = Dimensions.get('window').height;

  useEffect(() => {
    fetchVideoDetails();
  }, []);

  const fetchVideoDetails = async () => {
    try {
      const response = await axios.get(`http://localhost:8000/videos/${id}`);
      setVideoData(response.data.data);
    } catch (err) {
      setError('Failed to load video details');
    }
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <LinearGradient
        colors={['#0f1924', '#182635']}
        className="p-5"
      >
        <Text className="text-2xl font-pbold text-white text-center">
          Educational Video
        </Text>
        <Text className="text-base text-gray-400 text-center mt-1 font-pregular">
          Learn farming techniques
        </Text>
      </LinearGradient>

      <ScrollView className="flex-1">
        <View style={{ height: screenHeight * 0.4 }}>
          <Video
            source={{ uri: videoUrl }}
            rate={1.0}
            volume={1.0}
            isMuted={false}
            resizeMode="contain"
            shouldPlay={true}
            isLooping={false}
            style={{ flex: 1, width: '100%' }}
            useNativeControls
          />
        </View>

        <View className="p-4">
          {videoData ? (
            <>
              <Text className="text-2xl font-pbold text-white mb-2">
                {videoData.title}
              </Text>

              <LinearGradient
                colors={['#182635', '#0f1924']}
                className="p-4 rounded-lg mb-4"
              >
                <Text className="text-white font-pmedium mb-2">Description</Text>
                <Text className="text-gray-300 font-pregular leading-6">
                  {videoData.description}
                </Text>
              </LinearGradient>
            </>
          ) : error ? (
            <Text className="text-red-500 p-4 text-center">
              {error}
            </Text>
          ) : (
            <View className="p-4">
              <Text className="text-gray-400 text-center">Loading...</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default VideoPlayer;