import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Leaf, 
  ShieldCheck, 
  Scissors, 
  Spray,
  Droplet,
  Package 
} from 'lucide-react-native';
import { AlertTriangle } from 'lucide-react-native';

const SectionHeader = ({ Icon, title }) => (
  <View className="flex-row items-center mb-6 mt-8">
    {Icon && <Icon size={28} color="#00b890" />}
    <Text className="ml-4 text-xl font-psemibold text-white">{title}</Text>
  </View>
);

const ProductCard = ({ product }) => (
  <View className="bg-surface rounded-xl shadow-lg p-5 mb-4 flex-row items-center border border-gray-800">
    <Image 
      source={{ uri: product.imageUrl }} 
      className="w-24 h-24 rounded-lg mr-4" 
    />
    <View className="flex-1">
      <Text className="font-pmedium text-lg text-white">{product.name}</Text>
      <Text className="font-pregular text-primary text-lg">₹{product.price.toFixed(2)}</Text>
      <TouchableOpacity 
        className="bg-primary rounded-lg px-4 py-2 mt-3 self-start"
        onPress={() => {/* Add to cart logic */}}
      >
        <Text className="text-background font-pmedium">Add to Cart</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const PlantDiseaseDiagnosticScreen = () => {
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const analyzeImage = async () => {
    if (!image) {
      setError('Please select an image first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', {
        uri: image,
        type: 'image/jpeg',
        name: 'plant_image.jpg',
      });

      const response = await axios.post('http://127.0.0.1:5000/predict', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResult(response.data);
    } catch (err) {
      setError('Failed to analyze image. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView 
        contentContainerStyle={{ 
          flexGrow: 1, 
          padding: 20 
        }}
      >
        {/* Image Picker Section */}
        <View className="mb-8">
          <TouchableOpacity 
            onPress={pickImage}
            className="bg-surface rounded-xl p-6 items-center border border-gray-800"
          >
            <Leaf size={56} color="#00b890" />
            <Text className="text-gray-300 mt-3 font-pmedium text-lg">
              {image ? 'Change Image' : 'Select Plant Image'}
            </Text>
          </TouchableOpacity>

          {image && (
            <Image 
              source={{ uri: image }} 
              className="w-full h-72 rounded-xl mt-5" 
              resizeMode="cover" 
            />
          )}
        </View>

        {/* Analyze Button */}
        <TouchableOpacity
          onPress={analyzeImage}
          disabled={loading}
          className={`bg-primary rounded-xl p-4 items-center ${
            loading ? 'opacity-50' : ''
          }`}
        >
          {loading ? (
            <ActivityIndicator color="#0a0f1a" size="large" />
          ) : (
            <Text className="text-background font-pbold text-lg">Analyze Plant</Text>
          )}
        </TouchableOpacity>

        {/* Result Section */}
        {result && (
          <View className="mt-8 bg-surface rounded-xl p-6 shadow-xl border border-gray-800">
            {/* Disease Detection Header */}
            <View className="flex-row items-center mb-6 bg-surface/30 p-4 rounded-lg border border-red-500/30">
              <AlertTriangle size={36} color="#ef4444" />
              <View className="ml-4">
                <Text className="text-red-400 font-pmedium mb-1">Disease Detected</Text>
                <Text className="text-2xl font-pbold text-white">
                  {result.disease}
                </Text>
              </View>
            </View>

            {/* Cultural Control Section */}
            <SectionHeader 
              Icon={Scissors} 
              title="Cultural Management" 
            />
            <View className="pl-4">
              {result.solution.management.cultural_control.map((step, index) => (
                <Text 
                  key={index} 
                  className="text-white mb-3 text-base font-pregular leading-relaxed"
                >
                  • {step}
                </Text>
              ))}
            </View>

            {/* Fertilizer Recommendations */}
            <SectionHeader 
              Icon={Droplet} 
              title="Fertilizer Recommendations" 
            />
            <Text className="text-white mb-4 pl-4 font-pregular">
              {result.solution.management.fertilizer}
            </Text>

            {/* Fertilizer Products */}
            {result.solution.fertilizers.map((fertilizer, index) => (
              <ProductCard 
                key={index} 
                product={{
                  name: `${fertilizer} Fertilizer`,
                  price: 19.99,
                  imageUrl: 'https://m.media-amazon.com/images/I/71yx7NGeT3L.jpg'
                }} 
              />
            ))}

            {/* Fungicide Recommendations */}
            <SectionHeader 
              Icon={Spray} 
              title="Fungicide Recommendations" 
            />
            <Text className="text-white mb-4 pl-4">
              {result.solution.management.fungicide}
            </Text>

            {/* Fungicide Products */}
            {result.solution.fungicides.map((fungicide, index) => (
              <ProductCard 
                key={index} 
                product={{
                  name: `${fungicide} Fungicide`,
                  price: 100,
                  imageUrl: 'https://image.made-in-china.com/2f0j00oAlWwqSKSYkG/Chlorothalonil-Fungicide-50-Wp-75-Wp-40-Sc-75-Wdg-97-Tc-72-Sc-50-Sc.webp'
                }} 
              />
            ))}

            {/* Pesticide Section (if applicable) */}
            {result.solution.pesticides && result.solution.pesticides.length > 0 && (
              <>
                <SectionHeader 
                  Icon={Package} 
                  title="Pesticide Recommendations" 
                />
                {result.solution.pesticides.map((pesticide, index) => (
                  <ProductCard 
                    key={index} 
                    product={{
                      name: `${pesticide} Pesticide`,
                      price: 15999.99,
                      imageUrl: 'https://image.made-in-china.com/2f0j00oAlWwqSKSYkG/Chlorothalonil-Fungicide-50-Wp-75-Wp-40-Sc-75-Wdg-97-Tc-72-Sc-50-Sc.webp'
                    }} 
                  />
                ))}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default PlantDiseaseDiagnosticScreen;