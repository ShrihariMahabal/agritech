import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput,
  ScrollView,
  Image 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, MessageCircle, Heart, Share2, ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';

const PostDetailsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Add this function to extract the path
  const getImageSource = (image) => {
    if (!image) return null;
    if (typeof image === 'string') {
      return { uri: image };
    }
    return require('../../../assets/tomato-blight.jpeg');
  };
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([
    {
      id: 1,
      username: 'AgriExpert',
      timeAgo: '1h ago',
      content: 'This looks like early blight. Try using copper-based fungicide.',
      likes: 5,
    },
    {
      id: 2,
      username: 'FarmerSarah',
      timeAgo: '30m ago',
      content: 'I had the same issue last season. Proper spacing between plants helps prevent this.',
      likes: 3,
    },
  ]);

  const handleComment = () => {
    if (comment.trim()) {
      setComments([
        {
          id: comments.length + 1,
          username: 'You',
          timeAgo: 'Just now',
          content: comment,
          likes: 0,
        },
        ...comments,
      ]);
      setComment('');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center p-4 border-b border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-xl font-pbold text-white">Discussion</Text>
      </View>

      <ScrollView className="flex-1">
        {/* Original Post */}
        <View className="p-4 border-b border-gray-800">
          <View className="flex-row items-center mb-3">
            <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center">
              <Users size={20} color="#00b890" />
            </View>
            <View className="ml-3">
              <Text className="text-white font-pmedium">{params.username}</Text>
              <Text className="text-gray-400 text-sm">{params.timeAgo}</Text>
            </View>
          </View>
          <Text className="text-white text-base mb-4">
            {params.content}
          </Text>
          {params.image && (
            <Image 
              source={require('../../../assets/tomato-blight.jpeg')}
              className="w-full h-48 rounded-lg mb-4"
              resizeMode="cover"
            />
          )}
          <View className="flex-row justify-between pt-2 border-t border-gray-800">
            <TouchableOpacity className="flex-row items-center">
              <Heart size={20} color="#00b890" />
              <Text className="text-white ml-2">{params.likes}</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center">
              <MessageCircle size={20} color="#00b890" />
              <Text className="text-white ml-2">{params.comments}</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center">
              <Share2 size={20} color="#00b890" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Comments */}
        <View className="p-4">
          {comments.map((comment) => (
            <View key={comment.id} className="mb-4 bg-surface p-4 rounded-xl">
              <View className="flex-row items-center mb-2">
                <View className="w-8 h-8 rounded-full bg-primary/20 items-center justify-center">
                  <Users size={16} color="#00b890" />
                </View>
                <View className="ml-2">
                  <Text className="text-white font-pmedium">{comment.username}</Text>
                  <Text className="text-gray-400 text-xs">{comment.timeAgo}</Text>
                </View>
              </View>
              <Text className="text-white">{comment.content}</Text>
              <TouchableOpacity className="flex-row items-center mt-2">
                <Heart size={16} color="#00b890" />
                <Text className="text-white ml-2">{comment.likes}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Comment Input */}
      <View className="p-4 border-t border-gray-800 flex-row items-center">
        <TextInput
          className="flex-1 bg-surface text-white rounded-full px-4 py-2 mr-2"
          placeholder="Add a comment..."
          placeholderTextColor="#666"
          value={comment}
          onChangeText={setComment}
        />
        <TouchableOpacity 
          onPress={handleComment}
          className="bg-primary w-10 h-10 rounded-full items-center justify-center"
        >
          <MessageCircle size={20} color="#0a0f1a" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default PostDetailsScreen;