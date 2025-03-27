import { View, Text, FlatList, TouchableOpacity, Linking, StatusBar, ActivityIndicator, Modal, TextInput, Alert } from 'react-native'
import React, { useState, useEffect } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import * as Location from 'expo-location'
import { loans } from '../../data/loans'
import { termsConditionsSets } from '../../data/termsConditions'
import { findNearestBanks } from '../../utils/locationFilter'
import * as Speech from 'expo-speech';
import { translations } from '../../utils/translations'

// Remove the unused translate import
// import { translate } from '@vitalets/google-translate-api';

const Community = () => {
  const [filteredLoans, setFilteredLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBank, setSelectedBank] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // New states for loan application
  const [applicationModalVisible, setApplicationModalVisible] = useState(false);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [pincode, setPincode] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [processingOtp, setProcessingOtp] = useState(false);

  useEffect(() => {
    const getLocationAndFilterBanks = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Location permission denied');
          setFilteredLoans(loans.slice(0, 20));
          setLoading(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        const nearestBanks = findNearestBanks(location.coords, loans);
        setFilteredLoans(nearestBanks);
      } catch (err) {
        console.error('Error:', err);
        setError('Error finding nearby banks');
        setFilteredLoans(loans.slice(0, 20));
      } finally {
        setLoading(false);
      }
    };

    getLocationAndFilterBanks();
  }, []);

  // Handle loan application submission
  const handleApplicationSubmit = async () => {
    // Validate inputs
    if (!firstName || !lastName || !pincode || !loanAmount) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    
    if (pincode.length !== 6 || !/^\d+$/.test(pincode)) {
      Alert.alert('Error', 'Please enter a valid 6-digit pincode');
      return;
    }
    
    if (!/^\d+$/.test(loanAmount)) {
      Alert.alert('Error', 'Please enter a valid loan amount');
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Send application data to backend
      const response = await fetch('http://localhost:5001/apply-loan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          lastName,
          pincode,
          loanAmount
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to connect to server');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setApplicationModalVisible(false);
        setOtpModalVisible(true);
      } else {
        Alert.alert('Error', data.message || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Application submission error:', error);
      Alert.alert('Error', 'Failed to connect to server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle OTP submission
  const handleOtpSubmit = async () => {
    if (!otp || otp.length < 4) {
      Alert.alert('Error', 'Please enter a valid OTP');
      return;
    }
    
    setProcessingOtp(true);
    
    try {
      const response = await fetch('http://localhost:5001/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ otp }),
      });
      
      if (!response.ok) {
        throw new Error('Server error');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setOtpModalVisible(false);
        Alert.alert('Success', 'Your loan application has been submitted successfully!');
        // Reset form fields
        setFirstName('');
        setLastName('');
        setPincode('');
        setLoanAmount('');
        setOtp('');
      } else {
        if (data.message.includes('No active browser session')) {
          Alert.alert(
            'Session Expired',
            'Your session has expired. Please fill the form again.',
            [
              {
                text: 'OK',
                onPress: () => {
                  setOtpModalVisible(false);
                  setApplicationModalVisible(true);
                  setOtp('');
                }
              }
            ]
          );
        } else {
          Alert.alert('Error', data.message || 'Failed to verify OTP');
        }
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      Alert.alert(
        'Error',
        'Failed to connect to server. Please try again.',
        [
          {
            text: 'OK',
            onPress: () => {
              setOtpModalVisible(false);
              setApplicationModalVisible(true);
              setOtp('');
            }
          }
        ]
      );
    } finally {
      setProcessingOtp(false);
      // Clean up browser session on error or completion
      try {
        await fetch('http://localhost:5001/close-browser', {  // Replace X with your IP
          method: 'POST',
        });
      } catch (error) {
        console.error('Failed to close browser:', error);
      }
    }
  };

  const handleLinkPress = (url) => {
    Linking.openURL(url)
  }

  const simplifyTerms = (terms) => {
    // Convert complex terms to simple language
    const simplifiedTerms = terms.map(term => {
      const simple = term.replace(/shall|pursuant|thereof|herein|whereby/g, 'will')
        .replace(/utilization/g, 'use')
        .replace(/sanctioned amount/g, 'loan money')
        .replace(/disbursed/g, 'given')
        .replace(/tranches/g, 'parts')
        .replace(/verification/g, 'checking')
        .replace(/hypothecation/g, 'using as security')
        .replace(/collateral/g, 'extra security')
        .replace(/retrospective effect/g, 'going back to the start');
      return `In simple terms, ${simple}`;
    });
    return simplifiedTerms.join('. ');
  };

  // Add new state for language selection
  const [selectedLanguage, setSelectedLanguage] = useState(null);

  const handleSpeak = async (language) => {
    try {
      const setNumber = `set${(selectedBank?.id % 3) + 1}`;
      let textToSpeak;

      if (language === 'hi' || language === 'mr') {
        textToSpeak = translations[language][setNumber].join('. ');
      } else {
        const terms = termsConditionsSets[0][setNumber];
        textToSpeak = simplifyTerms(terms);
      }
      
      if (isSpeaking) {
        await Speech.stop();
        setIsSpeaking(false);
        setSelectedLanguage(null);
      } else {
        setIsSpeaking(true);
        setSelectedLanguage(language);
        Speech.speak(textToSpeak, {
          language: language,
          pitch: 1,
          rate: 0.9,
          onDone: () => {
            setIsSpeaking(false);
            setSelectedLanguage(null);
          },
        });
      }
    } catch (error) {
      console.error('Speech error:', error);
      handleSpeak('en');
    }
  };

  const renderTermsModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View className="flex-1 justify-end">
        <View className="bg-surface rounded-t-3xl p-6 h-3/4">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-white font-pmedium text-xl">
              {selectedBank?.bankName}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close-circle" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-primary font-pmedium text-lg">
              Terms & Conditions
            </Text>
            {!isSpeaking ? (
              <View className="flex-row gap-1">
                <TouchableOpacity 
                  onPress={() => handleSpeak('en')}
                  className="flex-row items-center bg-primary/10 px-2 py-1.5 rounded-full"
                >
                  <Ionicons name="play-circle" size={18} color="#00b890" />
                  <Text className="text-primary font-pmedium ml-1 text-xs">EN</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => handleSpeak('hi')}
                  className="flex-row items-center bg-primary/10 px-2 py-1.5 rounded-full"
                >
                  <Ionicons name="play-circle" size={18} color="#00b890" />
                  <Text className="text-primary font-pmedium ml-1 text-xs">हिंदी</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => handleSpeak('mr')}
                  className="flex-row items-center bg-primary/10 px-2 py-1.5 rounded-full"
                >
                  <Ionicons name="play-circle" size={18} color="#00b890" />
                  <Text className="text-primary font-pmedium ml-1 text-xs">मराठी</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                onPress={() => handleSpeak(selectedLanguage)}
                className="flex-row items-center bg-primary/10 px-3 py-1.5 rounded-full"
              >
                <Ionicons name="pause-circle" size={20} color="#00b890" />
                <Text className="text-primary font-pmedium ml-2 text-sm">Stop</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <FlatList
            data={termsConditionsSets[0][`set${(selectedBank?.id % 3) + 1}`]}
            renderItem={({item}) => (
              <Text className="text-gray-300 font-pregular text-sm mb-4 leading-5">
                {item}
              </Text>
            )}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </Modal>
  );

  const renderLoanItem = ({ item: loan, index }) => (
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
        onPress={() => {
          setSelectedBank({...loan, id: index});
          setModalVisible(true);
        }}
        className="flex-row items-center justify-center mt-4 bg-primary/10 border border-primary/30 p-3 rounded-lg"
      >
        <Ionicons name="shield-checkmark-outline" size={18} color="#00b890" />
        <Text className="text-primary font-pmedium ml-2">
          Terms & Conditions
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        onPress={() => handleLinkPress(loan.websiteLink)}
        className="flex-row items-center justify-center mt-2 bg-primary p-3 rounded-lg"
      >
        <Ionicons name="globe-outline" size={18} color="white" />
        <Text className="text-white font-pmedium ml-2">
          Apply Now
        </Text>
      </TouchableOpacity>
    </View>
  )

  // Application form modal
  const renderApplicationModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={applicationModalVisible}
      onRequestClose={() => setApplicationModalVisible(false)}
    >
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-surface rounded-xl p-6 w-11/12 max-w-md">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-white font-pmedium text-xl">Apply for Loan</Text>
            <TouchableOpacity onPress={() => setApplicationModalVisible(false)}>
              <Ionicons name="close-circle" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <View className="mb-4">
            <Text className="text-gray-300 font-pmedium mb-1">First Name</Text>
            <TextInput
              className="bg-background text-white p-3 rounded-lg border border-gray-700"
              placeholder="Enter first name"
              placeholderTextColor="#6B7280"
              value={firstName}
              onChangeText={setFirstName}
            />
          </View>
          
          <View className="mb-4">
            <Text className="text-gray-300 font-pmedium mb-1">Last Name</Text>
            <TextInput
              className="bg-background text-white p-3 rounded-lg border border-gray-700"
              placeholder="Enter last name"
              placeholderTextColor="#6B7280"
              value={lastName}
              onChangeText={setLastName}
            />
          </View>
          
          <View className="mb-4">
            <Text className="text-gray-300 font-pmedium mb-1">Pincode</Text>
            <TextInput
              className="bg-background text-white p-3 rounded-lg border border-gray-700"
              placeholder="Enter 6-digit pincode"
              placeholderTextColor="#6B7280"
              value={pincode}
              onChangeText={setPincode}
              keyboardType="numeric"
              maxLength={6}
            />
          </View>
          
          <View className="mb-6">
            <Text className="text-gray-300 font-pmedium mb-1">Loan Amount</Text>
            <TextInput
              className="bg-background text-white p-3 rounded-lg border border-gray-700"
              placeholder="Enter amount in rupees"
              placeholderTextColor="#6B7280"
              value={loanAmount}
              onChangeText={setLoanAmount}
              keyboardType="numeric"
            />
          </View>
          
          <TouchableOpacity 
            onPress={handleApplicationSubmit}
            disabled={submitting}
            className={`flex-row items-center justify-center bg-primary p-4 rounded-lg ${submitting ? 'opacity-70' : ''}`}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="white" />
                <Text className="text-white font-pmedium ml-2">Submit Application</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
  
  // OTP verification modal
  const renderOtpModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={otpModalVisible}
      onRequestClose={() => {
        if (!processingOtp) setOtpModalVisible(false);
      }}
    >
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-surface rounded-xl p-6 w-11/12 max-w-md">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-white font-pmedium text-xl">Enter OTP</Text>
            <TouchableOpacity 
              onPress={() => {
                if (!processingOtp) setOtpModalVisible(false);
              }}
              disabled={processingOtp}
            >
              <Ionicons name="close-circle" size={24} color={processingOtp ? "#4B5563" : "#6B7280"} />
            </TouchableOpacity>
          </View>
          
          <Text className="text-gray-300 font-pregular mb-4">
            Please enter the OTP sent to your mobile number
          </Text>
          
          <View className="mb-6">
            <TextInput
              className="bg-background text-white p-3 rounded-lg border border-gray-700 text-center text-xl tracking-widest"
              placeholder="Enter OTP"
              placeholderTextColor="#6B7280"
              value={otp}
              onChangeText={setOtp}
              keyboardType="numeric"
              maxLength={6}
            />
          </View>
          
          <TouchableOpacity 
            onPress={handleOtpSubmit}
            disabled={processingOtp}
            className={`flex-row items-center justify-center bg-primary p-4 rounded-lg ${processingOtp ? 'opacity-70' : ''}`}
          >
            {processingOtp ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="shield-checkmark" size={18} color="white" />
                <Text className="text-white font-pmedium ml-2">Verify OTP</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#00b890" />
        <Text className="text-gray-400 mt-4">Finding banks near you...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {renderTermsModal()}
      {renderApplicationModal()}
      {renderOtpModal()}
      <StatusBar barStyle="light-content" backgroundColor="#0a0f1a" />
      
      {/* Header */}
      <LinearGradient
        colors={['#131d2a', '#0a0f1a']}
        className="px-4 pt-4 pb-6"
      >
        <View className="flex-row justify-between items-center mb-2">
          <View className="flex-row items-center">
            <Ionicons name="business" size={24} color="#00b890" />
            <Text className="text-2xl text-white font-psemibold ml-2">Farmer Loans</Text>
          </View>
          
          {/* Apply Now Button */}
          <TouchableOpacity 
            onPress={() => setApplicationModalVisible(true)}
            className="bg-primary px-3 py-2 rounded-lg flex-row items-center"
          >
            <Ionicons name="add-circle-outline" size={18} color="white" />
            <Text className="text-white font-pmedium ml-1">Apply</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-gray-400 font-pregular text-base">
          {error ? 'Showing all available options' : 'Discover financing options near you'}
        </Text>
      </LinearGradient>

      {/* Stats Bar */}
      <View className="flex-row justify-between px-4 py-3 bg-surface/50">
        <View className="items-center">
          <Text className="text-primary font-pmedium text-lg">4-12%</Text>
          <Text className="text-gray-400 font-pregular text-xs">Interest Range</Text>
        </View>
        <View className="items-center">
          <Text className="text-primary font-pmedium text-lg">{filteredLoans.length}</Text>
          <Text className="text-gray-400 font-pregular text-xs">Banks</Text>
        </View>
        <View className="items-center">
          <Text className="text-primary font-pmedium text-lg">₹50L</Text>
          <Text className="text-gray-400 font-pregular text-xs">Max Amount</Text>
        </View>
      </View>

      <FlatList
        data={filteredLoans}
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