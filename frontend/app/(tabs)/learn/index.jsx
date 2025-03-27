import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Dimensions, ActivityIndicator, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { UNSPLASH_ACCESS_KEY, UNSPLASH_SEARCH_QUERY } from '@env';
import WebView from 'react-native-webview';
import { GoogleGenerativeAI } from "@google/generative-ai";

const { width } = Dimensions.get('window');
const THUMBNAIL_HEIGHT = 220;
const GEMINI_API_KEY = "AIzaSyBPohn_7cqPyK2dgvTTMfKrbLMw4fXdUY8";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const Learn = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [thumbnails, setThumbnails] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  // New states for search and chat
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedVideoTitle, setSelectedVideoTitle] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

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

  const handleSearchPress = () => {
    setIsSearchVisible(!isSearchVisible);
    if (!isSearchVisible) {
      setSearchResults([]);
      setSearchQuery('');
    }
  };

  const getVideoId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const handleVideoSelect = (video) => {
    setSelectedVideo(video.link);
    setSelectedVideoTitle(video.title);
    setChatMessages([]);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5001/search-youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery }),
      });
      
      const data = await response.json();
      if (data.success) {
        setSearchResults(data.results);
      } else {
        alert('Error: ' + data.message);
      }
    } catch (error) {
      alert('Error searching videos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = { type: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);
    
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      
      const prompt = `You are an expert on the YouTube video titled "${selectedVideoTitle}". 
                     Answer the following question as if you have watched and fully understood the video content: 
                     ${chatInput}`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const aiResponse = response.text();
      
      const aiMessage = { type: 'ai', text: aiResponse };
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Gemini API error:', error);
      const errorMessage = { 
        type: 'ai', 
        text: error.message.replace(/\*/g, '\\*')
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <LinearGradient 
        colors={['#0a0f1a', '#131d2a']} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="px-6 py-4 shadow-md"
      >
        <View className="flex-row justify-between items-center">
          <View className="flex-1">
            <Text className="text-2xl font-pbold text-white text-center">Learning Hub</Text>
            <Text className="text-sm text-gray-400 text-center mt-1 font-pregular">Discover and share farming knowledge</Text>
          </View>
          <View className="flex-row gap-2">
            <TouchableOpacity 
              onPress={handleRefresh} 
              className="p-2 rounded-full bg-surface"
              disabled={refreshing}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="refresh" size={20} color="#fff" />
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleSearchPress}
              className="p-2 rounded-full bg-surface"
            >
              <Ionicons name="search" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {isSearchVisible && (
          <View className="mt-4 flex-row items-center bg-surface rounded-xl overflow-hidden">
            <TextInput
              className="flex-1 px-4 py-3 text-white font-pregular"
              placeholder="What do you want to learn?"
              placeholderTextColor="#4a5568"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity 
              className="bg-primary px-6 py-3"
              onPress={handleSearch}
            >
              <Text className="text-white font-pmedium">Search</Text>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-5">
          {loading ? (
            <View className="flex-1 justify-center items-center py-20">
              <ActivityIndicator size="large" color="#00b890" />
              <Text className="text-white mt-4">Loading...</Text>
            </View>
          ) : searchResults.length > 0 ? (
            searchResults.map((video, index) => (
              <TouchableOpacity 
                key={index}
                className="mb-6 bg-surface rounded-xl overflow-hidden"
                onPress={() => handleVideoSelect(video)}
              >
                <Image
                  source={{ uri: video.thumbnail || DEFAULT_THUMBNAIL }}
                  style={{ width: '100%', height: THUMBNAIL_HEIGHT }}
                  className="rounded-t-xl"
                  resizeMode="cover"
                />
                <View className="p-4">
                  <Text className="text-white font-psemibold text-lg mb-2" numberOfLines={2}>
                    {video.title}
                  </Text>
                  <Text className="text-gray-400 font-pregular mb-1">
                    {video.channel}
                  </Text>
                  <Text className="text-gray-500 font-plight">
                    Duration: {video.duration}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            videos.map((video) => (
              <View key={video._id} className="mb-6 rounded-xl overflow-hidden bg-surface shadow-lg">
                {/* Keep your existing video card implementation */}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal
        visible={!!selectedVideo}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedVideo(null)}
      >
        <View className="flex-1 bg-background pt-12">
          <View className="h-56">
            <WebView
              source={{ 
                uri: selectedVideo ? 
                  `https://www.youtube.com/embed/${getVideoId(selectedVideo)}` : 
                  'about:blank'
              }}
              allowsFullscreenVideo
            />
          </View>
          
          <View className="flex-1 p-4">
            <Text className="text-white font-pbold text-xl mb-4">Ask about this video</Text>
            
            <ScrollView className="flex-1 mb-4">
              {chatMessages.map((msg, index) => (
                <View 
                  key={index} 
                  className={`mb-2 p-3 rounded-xl ${
                    msg.type === 'user' ? 'bg-primary self-end' : 'bg-surface self-start'
                  } max-w-[85%]`}
                >
                  <Text className="text-white">{msg.text}</Text>
                </View>
              ))}
              
              {chatLoading && (
                <View className="bg-surface self-start p-3 rounded-xl mb-2">
                  <Text className="text-white">Thinking...</Text>
                </View>
              )}
              
              {chatMessages.length === 0 && !chatLoading && (
                <View className="flex-1 justify-center items-center py-10">
                  <Text className="text-gray-400 text-center">
                    Ask questions about the video content
                  </Text>
                </View>
              )}
            </ScrollView>
            
            <View className="flex-row items-center bg-surface rounded-xl overflow-hidden">
              <TextInput
                className="flex-1 px-4 py-3 text-white font-pregular"
                placeholder="Ask about the video..."
                placeholderTextColor="#4a5568"
                value={chatInput}
                onChangeText={setChatInput}
              />
              <TouchableOpacity 
                className="bg-primary px-6 py-3"
                onPress={handleChat}
                disabled={chatLoading}
              >
                <Text className="text-white font-pmedium">Send</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            className="bg-primary p-4 mx-4 mb-4 rounded-xl"
            onPress={() => {
              setSelectedVideo(null);
              setChatMessages([]);
            }}
          >
            <Text className="text-white font-pmedium text-center">Close Video</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <TouchableOpacity 
        className="absolute right-5 bottom-5 w-14 h-14 rounded-full bg-primary justify-center items-center shadow-xl"
        onPress={handleUpload}
        activeOpacity={0.8}
      >
        <LinearGradient 
          colors={['#00b890', '#009e7a']}
          className="w-full h-full rounded-full justify-center items-center"
        >
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default Learn;