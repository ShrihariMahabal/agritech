import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  Image,
  Modal,
  TextInput,
  Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, MessageCircle, Heart, Share2, X, Image as ImageIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

const CommunityScreen = () => {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [posts, setPosts] = useState([
    {
      id: 1,
      username: 'FarmerJohn',
      timeAgo: '2h ago',
      content: 'My tomato plants have yellow spots on their leaves. Any idea what this could be?',
      likes: 12,
      comments: 8,
      image: require('../../../assets/tomato-blight.jpeg')
    }
  ]);

  const addNewPost = (newPost) => {
    setPosts([
      {
        id: posts.length + 1,
        username: 'You',
        timeAgo: 'Just now',
        likes: 0,
        comments: 0,
        ...newPost
      },
      ...posts
    ]);
  };

  React.useEffect(() => {
    if (router.params?.newPost) {
      const post = JSON.parse(router.params.newPost);
      addNewPost(post);
      router.setParams({ newPost: null });
    }
  }, [router.params?.newPost]);

  const handleLike = (postId) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, likes: post.likes + 1 }
        : post
    ));
  };

  const PostCard = ({ post }) => (
    <TouchableOpacity 
      onPress={() => router.push({
        pathname: '/products/post-details',
        params: { 
          username: post.username,
          timeAgo: post.timeAgo,
          content: post.content,
          image: post.image,
          likes: post.likes,
          comments: post.comments
        }
      })}
      className="bg-surface rounded-xl p-4 mb-4 border border-gray-800"
    >
      <View className="flex-row items-center mb-3">
        <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center">
          <Users size={20} color="#00b890" />
        </View>
        <View className="ml-3">
          <Text className="text-white font-pmedium">{post.username}</Text>
          <Text className="text-gray-400 text-sm">{post.timeAgo}</Text>
        </View>
      </View>

      <Text className="text-white text-base mb-4 font-pregular">
        {post.content}
      </Text>

      {post.image && (
        <Image 
          source={typeof post.image === 'string' ? { uri: post.image } : post.image}
          className="w-full h-48 rounded-lg mb-4"
          resizeMode="cover"
        />
      )}

      <View className="flex-row justify-between pt-2 border-t border-gray-800">
        <TouchableOpacity 
          className="flex-row items-center"
          onPress={(e) => {
            e.stopPropagation(); // Prevent navigation when clicking like
            handleLike(post.id);
          }}
        >
          <Heart size={20} color="#00b890" />
          <Text className="text-white ml-2">{post.likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-row items-center">
          <MessageCircle size={20} color="#00b890" />
          <Text className="text-white ml-2">{post.comments}</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-row items-center">
          <Share2 size={20} color="#00b890" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleSubmitQuestion = () => {
    if (newQuestion.trim()) {
      addNewPost({
        content: newQuestion,
        image: selectedImage
      });
      setModalVisible(false);
      setNewQuestion('');
      setSelectedImage(null);
    }
  };

  // Move QuestionModal outside of the component to prevent re-renders
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row justify-between items-center p-4 border-b border-gray-800">
        <Text className="text-2xl font-pbold text-white">Farmer Community</Text>
        <TouchableOpacity 
          onPress={() => setModalVisible(true)}
          className="bg-primary px-4 py-2 rounded-full"
        >
          <Text className="text-background font-pmedium">Ask Question</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable 
          className="flex-1 bg-black/50"
          onPress={() => setModalVisible(false)}
        >
          <Pressable className="flex-1 mt-20 bg-background rounded-t-3xl">
            <SafeAreaView className="flex-1">
              <View className="flex-row justify-between items-center p-4 border-b border-gray-800">
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <X size={24} color="#fff" />
                </TouchableOpacity>
                <Text className="text-xl font-pbold text-white">Ask Question</Text>
                <TouchableOpacity 
                  onPress={handleSubmitQuestion}
                  disabled={!newQuestion.trim()}
                  className={`bg-primary px-4 py-2 rounded-full ${!newQuestion.trim() ? 'opacity-50' : ''}`}
                >
                  <Text className="text-background font-pmedium">Post</Text>
                </TouchableOpacity>
              </View>

              <ScrollView className="flex-1 p-4">
                <TextInput
                  className="text-white text-lg font-pregular bg-surface p-4 rounded-xl min-h-[120px] mb-4"
                  placeholder="What's your farming question?"
                  placeholderTextColor="#666"
                  multiline
                  value={newQuestion}
                  onChangeText={setNewQuestion}
                />

                {selectedImage && (
                  <View className="mb-4">
                    <Image 
                      source={{ uri: selectedImage }} 
                      className="w-full h-48 rounded-xl"
                    />
                    <TouchableOpacity 
                      className="absolute top-2 right-2 bg-background/80 p-2 rounded-full"
                      onPress={() => setSelectedImage(null)}
                    >
                      <X size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity 
                  onPress={pickImage}
                  className="flex-row items-center bg-surface p-4 rounded-xl"
                >
                  <ImageIcon size={24} color="#00b890" />
                  <Text className="text-white ml-3 font-pmedium">Add Photo</Text>
                </TouchableOpacity>
              </ScrollView>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>

      <TouchableOpacity 
        className="absolute bottom-6 right-6 bg-primary w-14 h-14 rounded-full items-center justify-center"
        onPress={() => router.push('/products/communityy')}
      >
        <MessageCircle size={24} color="#0a0f1a" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default CommunityScreen;