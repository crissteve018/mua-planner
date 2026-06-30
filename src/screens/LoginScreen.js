import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { login, loginWithPassword, sendPhoneOTP } from '../api/auth';
import { useAuth } from '../context/AuthContext';

const GOLD = '#C9A84C';
const BG = '#0F0F0F';
const CARD = '#1C1C1C';
const INPUT_BG = '#272727';
const BORDER = '#383830';
const TEXT = '#F5F0E8';
const TEXT_SEC = '#A09070';
const TEXT_MUTED = '#6A6050';

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const [mode, setMode] = useState('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      if (mode === 'password') {
        if (!email.trim()) return Alert.alert('Required', 'Please enter your email');
        if (!password) return Alert.alert('Required', 'Please enter your password');
        const res = await loginWithPassword(email.trim().toLowerCase(), password);
        if (res.success) await signIn(res.data);
      } else if (mode === 'emailOtp') {
        if (!email.trim()) return Alert.alert('Required', 'Please enter your email');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) return Alert.alert('Invalid Email', 'Please enter a valid email');
        const res = await login(email.trim().toLowerCase());
        if (res.success) navigation.navigate('OTPVerification', { email: email.trim().toLowerCase(), purpose: 'login' });
      } else if (mode === 'phoneOtp') {
        if (!phone.trim()) return Alert.alert('Required', 'Please enter your phone number');
        const cleanPhone = phone.trim().startsWith('+') ? phone.trim() : `+91${phone.trim()}`;
        const res = await sendPhoneOTP(cleanPhone);
        if (res.success) navigation.navigate('OTPVerification', { phone: cleanPhone, purpose: 'phone_login' });
      }
    } catch (err) {
      Alert.alert('Login Failed', err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: 'password', label: 'Password', icon: 'lock-closed-outline' },
    { key: 'emailOtp', label: 'Email OTP', icon: 'mail-outline' },
    { key: 'phoneOtp', label: 'Phone OTP', icon: 'phone-portrait-outline' },
  ];

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false} automaticallyAdjustKeyboardInsets={true}>

        {/* Brand */}
        <View style={s.brand}>
          <Image source={require('../../assets/icon.png')} style={s.logo} />
          <Text style={s.appName}>MUA Planner</Text>
          <Text style={s.tagline}>Welcome back! Login to continue</Text>
        </View>

        {/* Form */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Login</Text>
          <Text style={s.cardSub}>Choose how you'd like to login</Text>

          {/* 3-tab toggle */}
          <View style={s.tabs}>
            {tabs.map(t => (
              <TouchableOpacity key={t.key} style={[s.tab, mode === t.key && s.tabActive]}
                onPress={() => setMode(t.key)} activeOpacity={0.8}>
                <Ionicons name={t.icon} size={13} color={mode === t.key ? BG : TEXT_MUTED} />
                <Text style={[s.tabText, mode === t.key && s.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {mode === 'password' && (
            <>
              <View style={s.group}>
                <Text style={s.label}>Email Address</Text>
                <View style={s.row}>
                  <Ionicons name="mail-outline" size={18} color={TEXT_MUTED} style={s.icon} />
                  <TextInput style={s.input} placeholder="you@example.com" placeholderTextColor={TEXT_MUTED}
                    value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
                    textContentType="emailAddress" returnKeyType="next" />
                </View>
              </View>
              <View style={s.group}>
                <Text style={s.label}>Password</Text>
                <View style={s.row}>
                  <Ionicons name="lock-closed-outline" size={18} color={TEXT_MUTED} style={s.icon} />
                  <TextInput style={s.input} placeholder="Enter your password" placeholderTextColor={TEXT_MUTED}
                    value={password} onChangeText={setPassword} secureTextEntry={!showPassword}
                    textContentType="password" returnKeyType="done" onSubmitEditing={handleLogin} />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.eye}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={TEXT_MUTED} />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {mode === 'emailOtp' && (
            <View style={s.group}>
              <Text style={s.label}>Email Address</Text>
              <View style={s.row}>
                <Ionicons name="mail-outline" size={18} color={TEXT_MUTED} style={s.icon} />
                <TextInput style={s.input} placeholder="you@example.com" placeholderTextColor={TEXT_MUTED}
                  value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
                  textContentType="emailAddress" returnKeyType="done" onSubmitEditing={handleLogin} />
              </View>
              <Text style={s.hint}>We'll send a 6-digit OTP to this email</Text>
            </View>
          )}

          {mode === 'phoneOtp' && (
            <View style={s.group}>
              <Text style={s.label}>Phone Number</Text>
              <View style={s.row}>
                <Text style={s.dialCode}>+91</Text>
                <TextInput style={s.input} placeholder="98765 43210" placeholderTextColor={TEXT_MUTED}
                  value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={10}
                  returnKeyType="done" onSubmitEditing={handleLogin} />
              </View>
              <Text style={s.hint}>We'll send a 6-digit OTP to this number</Text>
            </View>
          )}

          <TouchableOpacity style={[s.btn, loading && s.btnOff]} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color={BG} /> : (
              <>
                <Text style={s.btnText}>{mode === 'password' ? 'Login' : 'Send OTP'}</Text>
                <Ionicons name={mode === 'password' ? 'log-in-outline' : 'arrow-forward'} size={20} color={BG} />
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={s.footerLink}> Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },
  brand: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 100, height: 100, borderRadius: 22, marginBottom: 14 },
  appName: { fontSize: 28, fontWeight: '800', color: GOLD, letterSpacing: 1 },
  tagline: { fontSize: 13, color: TEXT_SEC, marginTop: 5 },
  card: {
    backgroundColor: CARD, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: BORDER,
    shadowColor: GOLD, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16,
  },
  cardTitle: { fontSize: 20, fontWeight: '800', color: GOLD, marginBottom: 4 },
  cardSub: { fontSize: 13, color: TEXT_SEC, marginBottom: 18 },
  tabs: { flexDirection: 'row', backgroundColor: INPUT_BG, borderRadius: 10, padding: 3, marginBottom: 22, gap: 3 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 8, gap: 4 },
  tabActive: { backgroundColor: GOLD },
  tabText: { fontSize: 11, fontWeight: '600', color: TEXT_MUTED },
  tabTextActive: { color: BG, fontWeight: '800' },
  group: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '700', color: TEXT_SEC, marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.8 },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: INPUT_BG,
    borderRadius: 11, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 13, height: 50,
  },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: TEXT },
  eye: { padding: 4 },
  dialCode: { fontSize: 15, color: GOLD, fontWeight: '700', marginRight: 8 },
  hint: { fontSize: 11, color: TEXT_MUTED, marginTop: 5 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: GOLD, borderRadius: 12, height: 52, marginTop: 10, gap: 8,
    shadowColor: GOLD, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10,
  },
  btnOff: { opacity: 0.6 },
  btnText: { color: BG, fontSize: 16, fontWeight: '800' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 26 },
  footerText: { fontSize: 14, color: TEXT_SEC },
  footerLink: { fontSize: 14, color: GOLD, fontWeight: '700' },
});
