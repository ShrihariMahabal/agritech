import { View, Text, FlatList, TouchableOpacity, Linking, StatusBar } from 'react-native'
import React from 'react'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { loans } from '../../data/loans'

const Community = () => {
  const handleLinkPress = (url) => {
    Linking.openURL(url)
  }

  const renderLoanItem = ({ item: loan }) => (
    <View className="bg-surface rounded-xl p-4 mb-4 border border-gray-800">
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="text-white font-pmedium text-lg">
            {loan.bankName}
          </Text>
          <View className="flex-row items-center mt-1">
            <Ionicons name="business-outline" size={14} color="#6B7280" />
            <Text className="text-gray-400 font-pregular ml-1">
              {loan.type}
            </Text>
          </View>
        </View>
        <View className="bg-primary/20 px-3 py-1.5 rounded-full">
          <Text className="text-primary font-pbold">
            {loan.interestRate}% p.a.
          </Text>
        </View>
      </View>

      {/* Features */}
            <View className="flex-row flex-wrap mt-3">
              {loan.features.map((feature, idx) => (
                <View 
                  key={idx} 
                  className="flex-row items-center mb-2 mr-2 bg-surface/30 px-2 py-1 rounded-full"
                >
                  <Ionicons name="checkmark-circle" size={14} color="#00b890" />
                  <Text className="text-gray-300 font-pregular ml-1 text-xs">
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
      
      <TouchableOpacity 
        onPress={() => handleLinkPress(loan.websiteLink)}
        className="flex-row items-center justify-center mt-4 bg-primary p-3 rounded-lg"
      >
        <Ionicons name="globe-outline" size={18} color="white" />
        <Text className="text-white font-pmedium ml-2">
          Apply Now
        </Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar barStyle="light-content" backgroundColor="#0a0f1a" />
      
      {/* Header */}
      <LinearGradient
        colors={['#131d2a', '#0a0f1a']}
        className="px-4 pt-4 pb-6"
      >
        <View className="flex-row items-center mb-2">
          <Ionicons name="business" size={24} color="#00b890" />
          <Text className="text-2xl text-white font-psemibold ml-2">Farmer Loans</Text>
        </View>
        <Text className="text-gray-400 font-pregular text-base">
          Discover agricultural financing options tailored for you
        </Text>
      </LinearGradient>

      {/* Stats Bar */}
      <View className="flex-row justify-between px-4 py-3 bg-surface/50">
        <View className="items-center">
          <Text className="text-primary font-pmedium text-lg">4-12%</Text>
          <Text className="text-gray-400 font-pregular text-xs">Interest Range</Text>
        </View>
        <View className="items-center">
          <Text className="text-primary font-pmedium text-lg">{loans.length}</Text>
          <Text className="text-gray-400 font-pregular text-xs">Banks</Text>
        </View>
        <View className="items-center">
          <Text className="text-primary font-pmedium text-lg">₹50L</Text>
          <Text className="text-gray-400 font-pregular text-xs">Max Amount</Text>
        </View>
      </View>

      <FlatList
        data={loans}
        renderItem={renderLoanItem}
        keyExtractor={(item, index) => index.toString()}
        contentContainerClassName="px-4 pt-4"
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
      />
    </SafeAreaView>
  )
}

export default Community