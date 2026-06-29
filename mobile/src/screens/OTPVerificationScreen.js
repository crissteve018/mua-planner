import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { verifySignup, verifyLogin, resendOTP, verifyPhoneOTP, sendPhoneOTP } from '../api/auth';
import { useAuth } from '../context/AuthContext';

const GOLD = '#C9A84C';
const BG = '#0F0F0F';
const CARD = '#1C1C1C';
const INPUT_BG = '#272727';
const BORDER = '#383830';
const TEXT = '#F5F0E8';
const TEXT_SEC = '#A09070';
const TEXT_MUTED = '#6A6050';
const OTP_LENGTH = 6;

export default function OTPVerificationScreen({ route, navigation }) {
  const { email, phone, purpose } = route.params;
  const { signIn } = useAuth();

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputs = useRef([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleChange = (text, index) => {
    const digit = text.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();
    if (digit && index === OTP_LENGTH - 1) {
      const code = newOtp.join('');
      if (code.length === OTP_LENGTH) handleVerify(code);
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
    }
  };

  const handleVerify = async (code) => {
    const finalCode = code || otp.join('');
    if (finalCode.length !== OTP_LENGTH) return Alert.alert('Incomplete', 'Please enter the full 6-digit OTP');
    setLoading(true);
    try {
      let res;
      if (phone) {
        res = await verifyPhoneOTP(phone, finalCode, route.params.name);
      } else {
        const verifyFn = purpose === 'login' ? verifyLogin : verifySignup;
        res = await verifyFn(email, finalCode);
      }
      if (res.success) await signIn(res.data);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Verification failed. Please try again.');
      setOtp(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      let res;
      if (phone) {
        res = await sendPhoneOTP(phone);
      } else {
        res = await resendOTP(email, purpose);
      }
      if (res.success) {
        Alert.alert('OTP Sent', phone ? 'A new OTP has been sent via SMS' : 'A new OTP has been sent to your email');
        setCountdown(60);
        setOtp(Array(OTP_LENGTH).fill(''));
        inputs.current[0]?.focus();
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to resend OTP. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false} automaticallyAdjustKeyboardInsets={true}>

        {/* Back */}
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={TEXT_SEC} />
        </TouchableOpacity>

        {/* Header */}
        <View style={s.header}>
          <View style={s.iconCircle}>
            <Ionicons name={phone ? 'phone-portrait-outline' : 'mail-open-outline'} size={34} color={BG} />
          </View>
          <Text style={s.title}>{phone ? 'Verify Your Phone' : 'Verify Your Email'}</Text>
          <Text style={s.subtitle}>
            {phone ? "We've sent a 6-digit code via SMS to" : "We've sent a 6-digit code to"}{' '}
            <Text style={s.highlight}>{phone || email}</Text>
          </Text>
        </View>

        {/* OTP boxes */}
        <View style={s.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={(ref) => (inputs.current[i] = ref)}
              style={[s.otpBox, digit ? s.otpBoxFilled : null]}
              textContentType={i === 0 ? 'oneTimeCode' : 'none'}
              autoComplete={i === 0 ? 'sms-otp' : 'off'}
              value={digit}
              onChangeText={(text) => handleChange(text, i)}
              onKeyPress={(e) => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              autoFocus={i === 0}
            />
          ))}
        </View>

        {/* Verify button */}
        <TouchableOpacity style={[s.btn, loading && s.btnOff]} onPress={() => handleVerify()} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color={BG} /> : (
            <>
              <Text style={s.btnText}>Verify</Text>
              <Ionicons name="checkmark-circle-outline" size={20} color={BG} />
            </>
          )}
        </TouchableOpacity>

        {/* Resend */}
        <View style={s.resendRow}>
          <Text style={s.resendText}>Didn't receive the code?  </Text>
          {countdown > 0 ? (
            <Text style={s.countdown}>Resend in {countdown}s</Text>
          ) : (
            <TouchableOpacity onPress={handleResend} disabled={resending}>
              <Text style={s.resendLink}>{resending ? 'Sending...' : 'Resend OTP'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 56, paddingBottom: 40, alignItems: 'center' },
  backBtn: {
    alignSelf: 'flex-start', width: 44, height: 44, borderRadius: 12,
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
    justifyContent: 'center', alignItems: 'center', marginBottom: 32,
  },
  header: { alignItems: 'center', marginBottom: 36, width: '100%' },
  iconCircle: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: GOLD,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    shadowColor: GOLD, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14,
  },
  title: { fontSize: 26, fontWeight: '800', color: GOLD, marginBottom: 10 },
  subtitle: { fontSize: 14, color: TEXT_SEC, textAlign: 'center', lineHeight: 22 },
  highlight: { fontWeight: '700', color: TEXT },
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 36, justifyContent: 'center' },
  otpBox: {
    width: 50, height: 58, borderRadius: 12, borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: CARD, textAlign: 'center', fontSize: 24, fontWeight: '700', color: TEXT,
  },
  otpBoxFilled: {
    borderColor: GOLD, backgroundColor: '#272218',
    shadowColor: GOLD, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6,
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: GOLD, borderRadius: 12, height: 52, width: '100%', gap: 8,
    shadowColor: GOLD, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10,
  },
  btnOff: { opacity: 0.6 },
  btnText: { color: BG, fontSize: 16, fontWeight: '800' },
  resendRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24 },
  resendText: { fontSize: 14, color: TEXT_SEC },
  countdown: { fontSize: 14, color: TEXT_MUTED, fontWeight: '600' },
  resendLink: { fontSize: 14, color: GOLD, fontWeight: '700' },
});
