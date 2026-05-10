import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Colors, Spacing, Radius, Typography, AccentOptions } from '../theme';
import { usePreferences } from '../store/PreferencesContext';

export default function SettingsScreen() {
  const { prefs, updatePrefs } = usePreferences();
  const accent = prefs.accentColor ?? Colors.accent;

  const [city, setCity] = useState(prefs.homeCity ?? '');
  const [apiKey, setApiKey] = useState(prefs.weatherApiKey ?? '');
  const [windThreshold, setWindThreshold] = useState(String(prefs.windThresholdKmh ?? 15));
  const [leadMinutes, setLeadMinutes] = useState(String(prefs.notifyLeadMinutes ?? 30));
  const [geocoding, setGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);

  const handleGeocode = async () => {
    if (!city.trim()) return;
    if (!apiKey.trim()) {
      Alert.alert('API Key required', 'Enter your WeatherAPI key first.');
      return;
    }
    setGeocoding(true);
    try {
      const url = `https://api.weatherapi.com/v1/search.json?key=${apiKey.trim()}&q=${encodeURIComponent(city.trim())}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        Alert.alert('API Error', `Status ${res.status}: ${data.error?.message || 'Check your API key and internet connection.'}`);
        return;
      }
      if (!data.length) {
        Alert.alert('City not found', `"${city}" not found. Try:\n• Check spelling (e.g., "London", "New York")\n• Try a nearby city or region name`);
        return;
      }
      const { lat, lon, name } = data[0];
      await updatePrefs({ homeCity: name, homeLat: lat, homeLon: lon });
      setCity(name);
      Alert.alert('Location saved', `${name} (${lat.toFixed(2)}, ${lon.toFixed(2)})`);
    } catch (err) {
      Alert.alert('Error', `Could not look up city: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setGeocoding(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Allow location access in your device settings to use this feature.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;

      const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
      const name = place?.city || place?.subregion || place?.region || 'Current location';

      await updatePrefs({ homeCity: name, homeLat: latitude, homeLon: longitude });
      setCity(name);
      Alert.alert('Location saved', `${name} (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`);
    } catch (err) {
      Alert.alert('Error', 'Could not get current location. Please try again.');
    } finally {
      setLocating(false);
    }
  };

  const handleSavePrefs = async () => {
    const wind = parseFloat(windThreshold);
    const lead = parseInt(leadMinutes, 10);
    if (isNaN(wind) || wind <= 0) { Alert.alert('Invalid wind threshold'); return; }
    if (isNaN(lead) || lead < 5) { Alert.alert('Lead time must be at least 5 minutes'); return; }
    await updatePrefs({
      windThresholdKmh: wind,
      notifyLeadMinutes: lead,
      weatherApiKey: apiKey.trim(),
    });
    Alert.alert('Saved', 'Preferences updated.');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Settings</Text>

        {/* Accent colors */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCENT COLOR</Text>
          <View style={styles.swatchRow}>
            {AccentOptions.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.swatch, { backgroundColor: opt.color },
                  prefs.accentColor === opt.color && styles.swatchSelected,
                ]}
                onPress={() => updatePrefs({ accentColor: opt.color })}
              >
                {prefs.accentColor === opt.color && (
                  <Text style={styles.swatchCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.swatchLabels}>
            {AccentOptions.map(opt => (
              <Text key={opt.key} style={styles.swatchLabel}>{opt.label}</Text>
            ))}
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HOME LOCATION</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1, borderColor: accent }]}
              placeholder="City name, e.g. London"
              placeholderTextColor={Colors.onSurfaceVar}
              value={city}
              onChangeText={setCity}
              returnKeyType="search"
              onSubmitEditing={handleGeocode}
            />
            <TouchableOpacity
              style={[styles.geoBtn, { backgroundColor: accent }]}
              onPress={handleGeocode}
              disabled={geocoding}
            >
              {geocoding
                ? <ActivityIndicator color={Colors.onAccent} size="small" />
                : <Text style={styles.geoBtnText}>Find</Text>
              }
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.currentLocBtn, { borderColor: accent }]}
            onPress={handleUseCurrentLocation}
            disabled={locating}
          >
            {locating
              ? <ActivityIndicator color={accent} size="small" />
              : <Text style={[styles.currentLocText, { color: accent }]}>Use current location</Text>
            }
          </TouchableOpacity>
          {prefs.homeLat != null && (
            <Text style={styles.coordHint}>
              Saved: {prefs.homeLat?.toFixed(4)}, {prefs.homeLon?.toFixed(4)}
            </Text>
          )}
        </View>

        {/* WeatherAPI Key */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>WEATHERAPI KEY</Text>
          <TextInput
            style={[styles.input, { borderColor: accent }]}
            placeholder="Paste your API key here"
            placeholderTextColor={Colors.onSurfaceVar}
            value={apiKey}
            onChangeText={setApiKey}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
          <Text style={styles.hint}>
            Free at weatherapi.com · 1,000,000 calls/month on free plan
          </Text>
        </View>

        {/* Wind threshold */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>WIND THRESHOLD (KM/H)</Text>
          <TextInput
            style={[styles.input, { borderColor: accent }]}
            placeholder="15"
            placeholderTextColor={Colors.onSurfaceVar}
            value={windThreshold}
            onChangeText={setWindThreshold}
            keyboardType="numeric"
          />
          <Text style={styles.hint}>Winds above this are flagged as BAD for running</Text>
        </View>

        {/* Notification lead time */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>NOTIFY MINUTES AHEAD</Text>
          <TextInput
            style={[styles.input, { borderColor: accent }]}
            placeholder="30"
            placeholderTextColor={Colors.onSurfaceVar}
            value={leadMinutes}
            onChangeText={setLeadMinutes}
            keyboardType="numeric"
          />
          <Text style={styles.hint}>Background check fires this many minutes before each run</Text>
        </View>

        {/* Save */}
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accent }]} onPress={handleSavePrefs} activeOpacity={0.85}>
          <Text style={styles.saveBtnText}>Save preferences</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: Spacing.lg, gap: Spacing.xl, paddingBottom: 60 },
  title: { ...Typography.h1, color: Colors.onSurface },
  section: { gap: Spacing.sm },
  sectionLabel: { ...Typography.label, color: Colors.onSurfaceVar },
  swatchRow: { flexDirection: 'row', gap: Spacing.md },
  swatch: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  swatchSelected: {
    borderWidth: 3, borderColor: Colors.onSurface,
  },
  swatchCheck: { color: Colors.white, fontWeight: '700', fontSize: 18 },
  swatchLabels: { flexDirection: 'row', gap: Spacing.md },
  swatchLabel: { ...Typography.micro, color: Colors.onSurfaceVar, width: 48, textAlign: 'center' },
  row: { flexDirection: 'row', gap: Spacing.sm },
  input: {
    backgroundColor: Colors.surface1, borderRadius: Radius.md, borderWidth: 1.5,
    paddingHorizontal: Spacing.md, paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    ...Typography.body, color: Colors.onSurface,
  },
  geoBtn: {
    borderRadius: Radius.md, paddingHorizontal: Spacing.lg,
    alignItems: 'center', justifyContent: 'center', minWidth: 68,
  },
  geoBtnText: { ...Typography.bodyBold, color: Colors.onAccent },
  currentLocBtn: {
    height: 44, borderRadius: Radius.md, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  currentLocText: { ...Typography.bodyBold },
  coordHint: { ...Typography.small, color: Colors.onSurfaceVar },
  hint: { ...Typography.small, color: Colors.onSurfaceVar, lineHeight: 18 },
  saveBtn: { height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm },
  saveBtnText: { ...Typography.bodyBold, color: Colors.onAccent, fontSize: 16 },
});
