import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';

const DEFAULT_COLORS = {
  bg: COLORS.inputBg, text: COLORS.text, textLight: COLORS.textMuted,
  border: COLORS.border, primary: COLORS.primary, surface: COLORS.surface,
};

/**
 * AutocompleteInput — search-as-you-type dropdown
 *
 * Props:
 *   value: string
 *   onChangeText: (text) => void
 *   data: string[]            — list of suggestions
 *   placeholder: string
 *   maxSuggestions: number     — default 6
 *   colors: { bg, text, textLight, border, primary, surface }
 */
export default function AutocompleteInput({
  value,
  onChangeText,
  data = [],
  placeholder = '',
  maxSuggestions = 6,
  colors = DEFAULT_COLORS,
  inputStyle,
  editable = true,
  onInputFocus,
}) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  const filtered = value && focused
    ? data
        .filter((item) => item.toLowerCase().includes(value.toLowerCase()))
        .slice(0, maxSuggestions)
    : [];

  const showDropdown = focused && filtered.length > 0 && value.length > 0;

  const handleSelect = useCallback((item) => {
    onChangeText(item);
    setFocused(false);
    Keyboard.dismiss();
  }, [onChangeText]);

  return (
    <View style={styles.wrapper}>
      <View style={[styles.inputRow, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: colors.text }, inputStyle]}
          placeholder={placeholder}
          placeholderTextColor={colors.textLight}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => { setFocused(true); if (onInputFocus) onInputFocus(); }}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          editable={editable}
        />
        {value ? (
          <TouchableOpacity
            onPress={() => { onChangeText(''); inputRef.current?.focus(); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={18} color={colors.textLight} />
          </TouchableOpacity>
        ) : (
          <Ionicons name="chevron-down" size={16} color={colors.textLight} />
        )}
      </View>

      {showDropdown && (
        <View style={[styles.dropdown, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          {filtered.map((item, idx) => {
            // Highlight matching text
            const lowerItem = item.toLowerCase();
            const lowerVal = value.toLowerCase();
            const matchIdx = lowerItem.indexOf(lowerVal);

            return (
              <TouchableOpacity
                key={`${item}-${idx}`}
                style={[
                  styles.dropdownItem,
                  idx < filtered.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
                onPress={() => handleSelect(item)}
                activeOpacity={0.6}
              >
                {matchIdx >= 0 ? (
                  <Text style={[styles.dropdownText, { color: colors.text }]}>
                    {item.slice(0, matchIdx)}
                    <Text style={{ fontWeight: '700', color: colors.primary }}>
                      {item.slice(matchIdx, matchIdx + value.length)}
                    </Text>
                    {item.slice(matchIdx + value.length)}
                  </Text>
                ) : (
                  <Text style={[styles.dropdownText, { color: colors.text }]}>{item}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    zIndex: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  dropdown: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownItem: {
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  dropdownText: {
    fontSize: 15,
  },
});
