import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const demoVideos = [
  {
    id: 1,
    title: 'Modern Farming Techniques',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
    duration: '5:30',
    author: 'FarmExpert'
  },
  {
    id: 2,
    title: 'Sustainable Agriculture',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
    duration: '7:15',
    author: 'EcoFarmer'
  },
  {
    id: 3,
    title: 'Crop Protection Tips',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
    duration: '4:45',
    author: 'AgriGuru'
  }
];

const Learn = () => {
  const handleViewMore = () => {
    router.push('/learn/videos');
  };

  const handleUpload = () => {
    router.push('/learn/upload');
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="bg-surface p-5">
        <Text className="text-2xl font-pbold text-white text-center">
          Learning Hub
        </Text>
        <Text className="text-base text-gray-400 text-center mt-1 font-pregular">
          Discover and share farming knowledge
        </Text>
      </View>

      <ScrollView className="flex-1">
        <View className="p-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-psemibold text-white">
              Featured Videos
            </Text>
            <TouchableOpacity onPress={handleViewMore}>
              <Text className="text-primary text-base font-pmedium">
                View More
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            className="-mx-4 px-4"
          >
            {demoVideos.map(video => (
              <TouchableOpacity 
                key={video.id} 
                className="w-[280px] mr-4 bg-surface rounded-xl overflow-hidden"
                onPress={() => router.push(`/learn/video/${video.id}`)}
              >
                <Image
                  source={{ uri: video.thumbnail }}
                  className="w-full h-[157px] bg-surface"
                />
                <View className="absolute right-2 bottom-[75px] bg-black/80 px-2 py-1 rounded">
                  <Text className="text-white text-xs font-pmedium">
                    {video.duration}
                  </Text>
                </View>
                <View className="p-3">
                  <Text className="text-base font-pmedium text-white mb-1" numberOfLines={2}>
                    {video.title}
                  </Text>
                  <Text className="text-sm text-gray-400 font-pregular">
                    {video.author}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
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