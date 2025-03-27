import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { UNSPLASH_ACCESS_KEY, UNSPLASH_SEARCH_QUERY } from '@env';

const { width } = Dimensions.get('window');
const THUMBNAIL_HEIGHT = 200;

const Learn = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [thumbnails, setThumbnails] = useState({});

  const fetchThumbnail = async () => {
    try {
      const response = await axios.get('https://api.unsplash.com/photos/random', {
        params: {
          query: UNSPLASH_SEARCH_QUERY,
          orientation: 'landscape',
        },
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`
        }
      });
      if (response.data && response.data.urls && response.data.urls.regular) {
        return response.data.urls.regular;
      } else {
        console.error('Unexpected response structure:', response.data);
        return null;
      }
    } catch (error) {
      console.error('Error fetching thumbnail:', error);
      return null;
    }
  };

  const fetchVideosWithThumbnails = async () => {
    try {
      const response = await axios.get('http://localhost:8000/videos');
      const videosData = response.data.data;

      const thumbnailPromises = videosData.map(async () => {
        const thumbnail = await fetchThumbnail();
        return thumbnail;
      });

      const thumbnailUrls = await Promise.all(thumbnailPromises);

      const thumbnailMap = {};
      videosData.forEach((video, index) => {
        thumbnailMap[video._id] = thumbnailUrls[index];
      });

      setVideos(videosData);
      setThumbnails(thumbnailMap);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideosWithThumbnails();
  }, []);

  const handleUpload = () => {
    router.push('/learn/upload');
  };

  const handleVideoPress = (filename) => {
    router.push(`/learn/video/${encodeURIComponent(filename)}`);
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchVideosWithThumbnails();
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <LinearGradient
        colors={['#0f1924', '#182635']}
        className="p-5"
      >
        <View className="flex-row justify-between items-center">
          <View className="flex-1">
            <Text className="text-2xl font-pbold text-white text-center">
              Learning Hub
            </Text>
            <Text className="text-base text-gray-400 text-center mt-1 font-pregular">
              Discover and share farming knowledge
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleRefresh}
            className="absolute right-0 p-2"
          >
            <Ionicons name="refresh" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView className="flex-1">
        <View className="p-4">
          {loading ? (
            <Text className="text-white text-center">Loading videos...</Text>
          ) : videos.length === 0 ? (
            <Text className="text-white text-center">No videos available</Text>
          ) : (
            videos.map((video) => (
              <TouchableOpacity
                key={video._id}
                className="bg-surface rounded-xl overflow-hidden mb-6"
                onPress={() => handleVideoPress(video.filename)}
              >
                <View className="relative">
                  <Image
                    source={{ uri: thumbnails[video._id] }}
                    style={{ width: '100%', height: THUMBNAIL_HEIGHT }}
                    className="rounded-t-xl"
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(24, 38, 53, 0.95)']}
                    className="absolute w-full h-24 bottom-0"
                  />
                </View>
                <View className="p-4">
                  <Text className="text-xl font-pbold text-white mb-2">
                    {video.title}
                  </Text>
                  <Text className="text-base text-gray-300 mb-3" numberOfLines={2}>
                    {video.description}
                  </Text>
                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center">
                      <Ionicons name="time-outline" size={16} color="#8b9eb5" />
                      <Text className="text-primary text-sm ml-1">
                        {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                      </Text>
                    </View>
                    <Text className="text-gray-400 text-sm">
                      {new Date(video.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        className="absolute right-5 bottom-5 w-[60px] h-[60px] rounded-full bg-primary justify-center items-center shadow-lg"
        onPress={handleUpload}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default Learn;