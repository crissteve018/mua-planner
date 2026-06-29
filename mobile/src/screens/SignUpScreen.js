import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { registerUser } from '../api/auth';

const GOLD = '#C9A84C';
const GOLD_LIGHT = '#E8C97A';
const BG = '#0F0F0F';
const CARD = '#1C1C1C';
const INPUT_BG = '#272727';
const BORDER = '#383830';
const TEXT = '#F5F0E8';
const TEXT_SEC = '#A09070';
const TEXT_MUTED = '#6A6050';

export default function SignUpScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!name.trim()) return Alert.alert('Required', 'Please enter your full name');
    if (!email.trim()) return Alert.alert('Required', 'Please enter your email address');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) return Alert.alert('Invalid Email', 'Please enter a valid email address');
    if (!phone.trim()) return Alert.alert('Required', 'Please enter your phone number');
    if (!password || password.length < 8) return Alert.alert('Weak Password', 'Password must be at least 8 characters');
    if (password !== confirmPassword) return Alert.alert('Mismatch', 'Passwords do not match');
    const cleanPhone = phone.trim().startsWith('+') ? phone.trim() : `+91${phone.trim()}`;
    setLoading(true);
    try {
      const res = await registerUser(name.trim(), email.trim().toLowerCase(), cleanPhone, password);
      if (res.success) {
        navigation.navigate('DualOTP', {
          name: name.trim(), email: email.trim().toLowerCase(),
          phone: cleanPhone, password,
          maskedEmail: res.maskedEmail, maskedPhone: res.maskedPhone, hasPhone: res.hasPhone,
        });
      }
    } catch (err) {
      Alert.alert('Sign Up Failed', err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false} automaticallyAdjustKeyboardInsets={true}>

        {/* Brand */}
        <View style={s.brand}>
          <Image source={require('../../assets/icon.png')} style={s.logo} />
          <Text style={s.appName}>MUA Planner</Text>
          <Text style={s.tagline}>Create your professional account</Text>
        </View>

        {/* Form */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Create Account</Text>
          <Text style={s.cardSub}>Fill in your details to get started</Text>

          <Field label="Full Name" required>
            <Ionicons name="person-outline" size={18} color={TEXT_MUTED} style={s.icon} />
            <TextInput style={s.input} placeholder="Your full name" placeholderTextColor={TEXT_MUTED}
              value={name} onChangeText={setName} autoCapitalize="words" returnKeyType="next" />
          </Field>

          <Field label="Email Address" required>
            <Ionicons name="mail-outline" size={18} color={TEXT_MUTED} style={s.icon} />
            <TextInput style={s.input} placeholder="you@example.com" placeholderTextColor={TEXT_MUTED}
              value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
              textContentType="emailAddress" returnKeyType="next" />
          </Field>

          <Field label="Phone Number" required hint="India (+91) auto-applied. Start with + for other countries.">
            <Text style={s.dialCode}>+91</Text>
            <TextInput style={s.input} placeholder="98765 43210" placeholderTextColor={TEXT_MUTED}
              value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={10} returnKeyType="next" />
          </Field>

          <Field label="Password" required>
            <Ionicons name="lock-closed-outline" size={18} color={TEXT_MUTED} style={s.icon} />
            <TextInput style={s.input} placeholder="Minimum 8 characters" placeholderTextColor={TEXT_MUTED}
              value={password} onChangeText={setPassword} secureTextEntry={!showPassword}
              textContentType="newPassword" returnKeyType="next" />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.eye}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={TEXT_MUTED} />
            </TouchableOpacity>
          </Field>

          <Field label="Confirm Password" required>
            <Ionicons name="lock-closed-outline" size={18} color={TEXT_MUTED} style={s.icon} />
            <TextInput style={s.input} placeholder="Re-enter password" placeholderTextColor={TEXT_MUTED}
              value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showConfirm}
              textContentType="newPassword" returnKeyType="done" onSubmitEditing={handleSignUp} />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={s.eye}>
              <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={TEXT_MUTED} />
            </TouchableOpacity>
          </Field>

          <TouchableOpacity style={[s.btn, loading && s.btnOff]} onPress={handleSignUp} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color={BG} /> : (
              <>
                <Text style={s.btnText}>Create Account</Text>
                <Ionicons name="arrow-forward" size={20} color={BG} />
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={s.footerLink}> Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <View style={s.group}>
      <Text style={s.label}>{label}{required && <Text style={s.req}> *</Text>}</Text>
      <View style={s.row}>{children}</View>
      {hint && <Text style={s.hint}>{hint}</Text>}
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
  cardSub: { fontSize: 13, color: TEXT_SEC, marginBottom: 22 },
  group: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '700', color: TEXT_SEC, marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.8 },
  req: { color: GOLD },
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
