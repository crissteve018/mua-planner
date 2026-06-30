import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { verifyRegistration, registerUser } from '../api/auth';

const GOLD = '#C9A84C';
const BG = '#0F0F0F';
const CARD = '#1C1C1C';
const INPUT_BG = '#272727';
const BORDER = '#383830';
const TEXT = '#F5F0E8';
const TEXT_SEC = '#A09070';
const TEXT_MUTED = '#6A6050';
const OTP_LENGTH = 6;

function OTPInput({ value, onChange, inputRefs, startIndex, label, masked, icon }) {
  const handleChange = (text, i) => {
    const digit = text.replace(/[^0-9]/g, '');
    const newVal = [...value];
    newVal[i] = digit;
    onChange(newVal);
    if (digit && i < OTP_LENGTH - 1) inputRefs.current[startIndex + i + 1]?.focus();
  };
  const handleKeyPress = (e, i) => {
    if (e.nativeEvent.key === 'Backspace' && !value[i] && i > 0) {
      inputRefs.current[startIndex + i - 1]?.focus();
      const newVal = [...value];
      newVal[i - 1] = '';
      onChange(newVal);
    }
  };
  return (
    <View style={s.otpBlock}>
      <View style={s.otpLabelRow}>
        <Ionicons name={icon} size={16} color={GOLD} />
        <Text style={s.otpLabel}>{label}</Text>
      </View>
      <Text style={s.maskedText}>{masked}</Text>
      <View style={s.otpRow}>
        {value.map((digit, i) => (
          <TextInput
            key={i}
            ref={el => { inputRefs.current[startIndex + i] = el; }}
            style={[s.otpCell, digit && s.otpCellFilled]}
            value={digit}
            onChangeText={text => handleChange(text, i)}
            onKeyPress={e => handleKeyPress(e, i)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
          />
        ))}
      </View>
    </View>
  );
}

export default function DualOTPScreen({ route, navigation }) {
  const { name, email, phone, password, maskedEmail, maskedPhone, hasPhone } = route.params;

  const [emailOtp, setEmailOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [phoneOtp, setPhoneOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const handleVerify = async () => {
    const eCode = emailOtp.join('');
    if (eCode.length !== OTP_LENGTH) return Alert.alert('Incomplete', 'Please enter the full 6-digit email OTP');
    if (hasPhone) {
      const pCode = phoneOtp.join('');
      if (pCode.length !== OTP_LENGTH) return Alert.alert('Incomplete', 'Please enter the full 6-digit phone OTP');
    }
    setLoading(true);
    try {
      const pCode = hasPhone ? phoneOtp.join('') : null;
      const res = await verifyRegistration(name, email, phone, password, eCode, pCode);
      if (res.success) {
        Alert.alert('Account Created!', 'Your account is ready. Please login to continue.', [
          { text: 'Login', onPress: () => navigation.navigate('Login') },
        ]);
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Verification failed. Please try again.');
      setEmailOtp(Array(OTP_LENGTH).fill(''));
      setPhoneOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      await registerUser(name, email, phone, password);
      setCountdown(60);
      setEmailOtp(Array(OTP_LENGTH).fill(''));
      setPhoneOtp(Array(OTP_LENGTH).fill(''));
      Alert.alert('Resent', 'New OTPs have been sent.');
    } catch (err) {
      Alert.alert('Error', 'Could not resend OTPs. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.iconCircle}>
            <Ionicons name="shield-checkmark-outline" size={34} color={BG} />
          </View>
          <Text style={s.title}>Verify Your Account</Text>
          <Text style={s.subtitle}>
            {hasPhone
              ? 'Enter the OTPs sent to your email and phone'
              : 'Enter the OTP sent to your email'}
          </Text>
        </View>

        {/* OTP card */}
        <View style={s.card}>
          <OTPInput
            value={emailOtp} onChange={setEmailOtp} inputRefs={inputRefs}
            startIndex={0} label="Email OTP" masked={maskedEmail} icon="mail-outline"
          />
          {hasPhone && (
            <OTPInput
              value={phoneOtp} onChange={setPhoneOtp} inputRefs={inputRefs}
              startIndex={OTP_LENGTH} label="Phone OTP" masked={maskedPhone} icon="phone-portrait-outline"
            />
          )}

          <TouchableOpacity style={[s.btn, loading && s.btnOff]} onPress={handleVerify} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color={BG} /> : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color={BG} />
                <Text style={s.btnText}>Verify & Create Account</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleResend} disabled={countdown > 0 || resending} style={s.resendBtn}>
            {resending ? <ActivityIndicator size="small" color={GOLD} /> : (
              <Text style={[s.resendText, countdown > 0 && s.resendOff]}>
                {countdown > 0 ? `Resend OTPs in ${countdown}s` : 'Resend OTPs'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('SignUp')} style={s.backLink}>
          <Ionicons name="arrow-back" size={15} color={TEXT_SEC} />
          <Text style={s.backText}> Back to Sign Up</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 32 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: GOLD,
    justifyContent: 'center', alignItems: 'center', marginBottom: 18,
    shadowColor: GOLD, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14,
  },
  title: { fontSize: 26, fontWeight: '800', color: GOLD, marginBottom: 8 },
  subtitle: { fontSize: 14, color: TEXT_SEC, textAlign: 'center', lineHeight: 20 },
  card: {
    backgroundColor: CARD, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: BORDER,
    shadowColor: GOLD, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16,
  },
  otpBlock: { marginBottom: 24 },
  otpLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  otpLabel: { fontSize: 13, fontWeight: '700', color: TEXT_SEC, textTransform: 'uppercase', letterSpacing: 0.6 },
  maskedText: { fontSize: 13, color: TEXT_MUTED, marginBottom: 12 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between' },
  otpCell: {
    width: 46, height: 54, borderRadius: 12, borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: INPUT_BG, textAlign: 'center', fontSize: 22, fontWeight: '700', color: TEXT,
  },
  otpCellFilled: {
    borderColor: GOLD, backgroundColor: '#272218',
    shadowColor: GOLD, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6,
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: GOLD, borderRadius: 12, height: 52, gap: 8,
    shadowColor: GOLD, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10,
  },
  btnOff: { opacity: 0.6 },
  btnText: { color: BG, fontSize: 16, fontWeight: '800' },
  resendBtn: { alignItems: 'center', marginTop: 18, padding: 8 },
  resendText: { fontSize: 14, color: GOLD, fontWeight: '600' },
  resendOff: { color: TEXT_MUTED },
  backLink: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  backText: { fontSize: 14, color: TEXT_SEC },
});
