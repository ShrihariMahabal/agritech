import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { UNSPLASH_ACCESS_KEY, UNSPLASH_SEARCH_QUERY } from '@env';

const { width } = Dimensions.get('window');
const THUMBNAIL_HEIGHT = 220;

const Learn = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [thumbnails, setThumbnails] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  const DEFAULT_THUMBNAIL = "https://t4.ftcdn.net/jpg/05/95/55/89/360_F_595558921_z1JnF4ieH75XlWoDPuh1Os97QkPnb4dx.jpg";

  const fetchThumbnail = async () => {
    if (!UNSPLASH_ACCESS_KEY || !UNSPLASH_SEARCH_QUERY) {
      console.error('UNSPLASH_ACCESS_KEY or UNSPLASH_SEARCH_QUERY is not defined.');
      return DEFAULT_THUMBNAIL;
    }

    try {
      const response = await axios.get('https://api.unsplash.com/photos/random', {
        params: {
          query: UNSPLASH_SEARCH_QUERY,
          orientation: 'landscape',
        },
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
      });

      if (response.data && response.data.urls && response.data.urls.regular) {
        return response.data.urls.regular;
      } else {
        console.error('Unexpected Unsplash API response:', response.data);
        return DEFAULT_THUMBNAIL;
      }
    } catch (error) {
      console.error('Error fetching thumbnail:', error.message, error.response);
      return DEFAULT_THUMBNAIL;
    }
  };

  const fetchVideosWithThumbnails = async () => {
    try {
      const response = await axios.get('http://localhost:8000/videos');
      const videosData = response.data.data;

      const thumbnailPromises = videosData.map(async () => {
        return await fetchThumbnail();
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
      setRefreshing(false);
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
    setRefreshing(true);
    fetchVideosWithThumbnails();
  };

  const handleLike = async (videoId) => {
    try {
      const response = await axios.put(`http://localhost:8000/videos/${videoId}/like`);
      if (response.data.success) {
        setVideos(videos.map(video => 
          video._id === videoId 
            ? { ...video, likes: (video.likes || 0) + 1 }
            : video
        ));
      }
    } catch (error) {
      console.error('Error liking video:', error);
    }
  };
  
  const handleDislike = async (videoId) => {
    try {
      const response = await axios.put(`http://localhost:8000/videos/${videoId}/dislike`);
      if (response.data.success) {
        setVideos(videos.map(video => 
          video._id === videoId 
            ? { ...video, dislikes: (video.dislikes || 0) + 1 }
            : video
        ));
      }
    } catch (error) {
      console.error('Error disliking video:', error);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0A1016]">
      {/* Header */}
      <LinearGradient 
        colors={['#0f1924', '#182635']} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="px-6 py-4 shadow-md"
      >
        <View className="flex-row justify-between items-center">
          <View className="flex-1">
            <Text className="text-2xl font-pbold text-white text-center">Learning Hub</Text>
            <Text className="text-sm text-gray-400 text-center mt-1 font-pregular">Discover and share farming knowledge</Text>
          </View>
          <TouchableOpacity 
            onPress={handleRefresh} 
            className="p-2 rounded-full bg-[#1E293B]"
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="refresh" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-5">
          {loading ? (
            <View className="flex-1 justify-center items-center py-20">
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text className="text-white mt-4">Loading videos...</Text>
            </View>
          ) : videos.length === 0 ? (
            <View className="flex-1 justify-center items-center py-20">
              <Ionicons name="videocam-off" size={48} color="#64748B" />
              <Text className="text-gray-400 text-lg mt-4 text-center">No videos available yet</Text>
              <Text className="text-gray-500 text-sm mt-2 text-center">Be the first to upload a farming tutorial</Text>
            </View>
          ) : (
            videos.map((video) => (
              <View key={video._id} className="mb-6 rounded-xl overflow-hidden bg-[#1E293B] shadow-lg">
                {/* Video Thumbnail */}
                <TouchableOpacity onPress={() => handleVideoPress(video.filename)} activeOpacity={0.9}>
                  <View className="relative">
                    <Image 
                      source={{ uri: thumbnails[video._id] || DEFAULT_THUMBNAIL }} 
                      style={{ width: '100%', height: THUMBNAIL_HEIGHT }} 
                      className="rounded-t-xl" 
                      resizeMode="cover" 
                    />
                    <LinearGradient 
                      colors={['transparent', 'rgba(0,0,0,0.7)']} 
                      className="absolute w-full h-full"
                    />
                    <View className="absolute top-3 left-3 bg-black/70 px-2 py-1 rounded-md">
                      <Text className="text-white text-xs font-pmedium">
                        {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                      </Text>
                    </View>
                    <View className="absolute bottom-3 right-3 bg-black/70 px-2 py-1 rounded-md">
                      <Ionicons name="play-circle" size={24} color="#fff" />
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Video Info */}
                <View className="p-4">
                  <Text className="text-xl font-pbold text-white mb-2">{video.title}</Text>
                  <Text className="text-gray-300 text-sm mb-4 font-pregular" numberOfLines={2}>
                    {video.description}
                  </Text>
                  
                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center gap-4">
                      <TouchableOpacity 
                        className="flex-row items-center" 
                        onPress={() => handleLike(video._id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="thumbs-up" size={18} color="#8b9eb5" />
                        <Text className="text-gray-400 text-xs ml-1 font-pmedium">
                          {video.likes || 0}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        className="flex-row items-center"
                        onPress={() => handleDislike(video._id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="thumbs-down" size={18} color="#8b9eb5" />
                        <Text className="text-gray-400 text-xs ml-1 font-pmedium">
                          {video.dislikes || 0}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    
                    <View className="flex-row items-center">
                      <Ionicons name="calendar-outline" size={14} color="#64748B" />
                      <Text className="text-gray-400 text-xs ml-1">
                        {new Date(video.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Upload Button */}
      <TouchableOpacity 
        className="absolute right-5 bottom-5 w-14 h-14 rounded-full bg-[#3B82F6] justify-center items-center shadow-xl"
        onPress={handleUpload}
        activeOpacity={0.8}
      >
        <LinearGradient 
          colors={['#3B82F6', '#2563EB']}
          className="w-full h-full rounded-full justify-center items-center"
        >
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default Learn;