import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput,
  Image,
  ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as ImageIcon, X, Camera } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

const AskQuestionScreen = () => {
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [image, setImage] = useState(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSubmit = () => {
    if (question.trim()) {
      // Create new post object
      const newPost = {
        content: question,
        image: image
      };

      // Navigate back and pass the new post data
      router.back();
      router.setParams({ newPost: JSON.stringify(newPost) });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row justify-between items-center p-4 border-b border-gray-800">
        <TouchableOpacity onPress={() => router.back()}>
          <X size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-xl font-pbold text-white">Ask Question</Text>
        <TouchableOpacity 
          onPress={handleSubmit}
          disabled={!question.trim()}
          className={`bg-primary px-4 py-2 rounded-full ${!question.trim() ? 'opacity-50' : ''}`}
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
          value={question}
          onChangeText={setQuestion}
        />

        {image && (
          <View className="mb-4">
            <Image 
              source={{ uri: image }} 
              className="w-full h-48 rounded-xl"
            />
            <TouchableOpacity 
              className="absolute top-2 right-2 bg-background/80 p-2 rounded-full"
              onPress={() => setImage(null)}
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
  );
};

export default AskQuestionScreen;