import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Switch,
  StyleSheet, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import * as Location from 'expo-location';
import { usePreferences, useTokens } from '../store/PreferencesContext';
import { Icon, IconName } from '../components/Icon';
import { Card } from '../components/Card';
import { TopBar } from '../components/TopBar';
import { SectionTitle } from '../components/SectionTitle';
import { AccentOptions } from '../theme';
import type { UnitDistance, UnitTemp, UnitWind } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = StackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const { prefs, updatePrefs } = usePreferences();
  const tk = useTokens();

  const [city, setCity] = useState(prefs.homeCity ?? '');
  const [apiKey, setApiKey] = useState(prefs.weatherApiKey ?? '');
  const [geocoding, setGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);

  const connectedCount =
    (prefs.stravaConnected ? 1 : 0) +
    (prefs.spotifyConnected ? 1 : 0) +
    (prefs.garminConnected ? 1 : 0) +
    (prefs.healthConnectConnected ? 1 : 0);

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
        Alert.alert('API Error', `Status ${res.status}: ${data.error?.message || 'Check your API key.'}`);
        return;
      }
      if (!data.length) {
        Alert.alert('City not found', `"${city}" not found. Try a nearby city.`);
        return;
      }
      const { lat, lon, name } = data[0];
      await updatePrefs({ homeCity: name, homeLat: lat, homeLon: lon, weatherApiKey: apiKey.trim() });
      setCity(name);
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
        Alert.alert('Permission denied', 'Allow location access in your device settings.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
      const name = place?.city || place?.subregion || place?.region || 'Current location';
      await updatePrefs({ homeCity: name, homeLat: latitude, homeLon: longitude });
      setCity(name);
    } catch (err) {
      Alert.alert('Error', 'Could not get current location.');
    } finally {
      setLocating(false);
    }
  };

  const windPct = Math.round((prefs.windThresholdKmh / 40) * 100);
  const rainPct = prefs.rainChanceThreshold;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tk.surface }]} edges={['top', 'left', 'right']}>
      <View style={{ paddingHorizontal: 16 }}>
        <TopBar title="Settings"/>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Appearance */}
        <SectionTitle title="Appearance"/>
        <Card tone="surface1" padded={false}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: tk.onSurface }]}>Accent color</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {AccentOptions.map(opt => {
                const active = prefs.accentColor === opt.color;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => updatePrefs({ accentColor: opt.color })}
                    style={[
                      styles.swatch,
                      { backgroundColor: opt.color },
                      active && { borderWidth: 3, borderColor: tk.onSurface },
                    ]}
                  >
                    {active && <Icon name="check" size={14} color="#fff"/>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <Divider/>
          <ToggleRow
            icon="moon"
            label="Dark mode"
            sub="Easier on the eyes at night"
            value={prefs.darkMode}
            onToggle={v => updatePrefs({ darkMode: v })}
          />
        </Card>

        {/* Home location */}
        <SectionTitle title="Home location"/>
        <Card tone="surface1" padded={false}>
          <View style={{ padding: 18, gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1, color: tk.onSurface, borderColor: tk.outline, backgroundColor: tk.surface2 }]}
                placeholder="City name, e.g. London"
                placeholderTextColor={tk.onSurfaceVar}
                value={city}
                onChangeText={setCity}
                returnKeyType="search"
                onSubmitEditing={handleGeocode}
              />
              <TouchableOpacity
                style={[styles.findBtn, { backgroundColor: tk.accent }]}
                onPress={handleGeocode}
                disabled={geocoding}
              >
                {geocoding
                  ? <ActivityIndicator color={tk.onAccent} size="small"/>
                  : <Text style={{ color: tk.onAccent, fontSize: 14, fontWeight: '600' }}>Find</Text>}
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.outlineBtn, { borderColor: tk.outlineStrong }]}
              onPress={handleUseCurrentLocation}
              disabled={locating}
            >
              {locating
                ? <ActivityIndicator color={tk.accent} size="small"/>
                : (
                  <>
                    <Icon name="location" size={18} color={tk.onSurface}/>
                    <Text style={{ color: tk.onSurface, fontSize: 14, fontWeight: '600' }}>Use current location</Text>
                  </>
                )}
            </TouchableOpacity>
            {prefs.homeLat != null && (
              <Text style={{ color: tk.onSurfaceVar, fontSize: 12 }}>
                Saved: {prefs.homeCity} ({prefs.homeLat?.toFixed(2)}, {prefs.homeLon?.toFixed(2)})
              </Text>
            )}
          </View>
        </Card>

        {/* Weather thresholds */}
        <SectionTitle title="Weather thresholds"/>
        <Card tone="surface1" padded={false}>
          <ThresholdSlider
            icon="wind"
            label="Max wind"
            value={`${prefs.windThresholdKmh} km/h`}
            min={5} max={40} step={1}
            current={prefs.windThresholdKmh}
            onChange={v => updatePrefs({ windThresholdKmh: v })}
          />
          <Divider/>
          <ThresholdSlider
            icon="drop"
            label="Max rain chance"
            value={`${prefs.rainChanceThreshold}%`}
            min={0} max={100} step={5}
            current={prefs.rainChanceThreshold}
            onChange={v => updatePrefs({ rainChanceThreshold: v })}
          />
        </Card>

        {/* Notifications */}
        <SectionTitle title="Notifications"/>
        <Card tone="surface1" padded={false}>
          <ThresholdSlider
            icon="bell"
            label="Lead time"
            value={`${prefs.notifyLeadMinutes} min ahead`}
            min={5} max={120} step={5}
            current={prefs.notifyLeadMinutes}
            onChange={v => updatePrefs({ notifyLeadMinutes: v })}
          />
          <Divider/>
          <ToggleRow
            icon="bolt"
            label="Weather changed"
            sub="Alert if forecast turns bad"
            value={prefs.notifyOnChange}
            onToggle={v => updatePrefs({ notifyOnChange: v })}
          />
          <Divider/>
          <ToggleRow
            icon="moon"
            label="Quiet hours"
            sub="10:00 PM – 6:00 AM"
            value={prefs.quietHoursEnabled}
            onToggle={v => updatePrefs({ quietHoursEnabled: v })}
          />
        </Card>

        {/* Units */}
        <SectionTitle title="Units"/>
        <Card tone="surface1" padded={false}>
          <UnitRow
            label="Distance"
            options={['km', 'mi'] as UnitDistance[]}
            active={prefs.unitDistance}
            onChange={v => updatePrefs({ unitDistance: v })}
          />
          <Divider/>
          <UnitRow
            label="Temperature"
            options={['C', 'F'] as UnitTemp[]}
            active={prefs.unitTemp}
            onChange={v => updatePrefs({ unitTemp: v })}
            labelOf={u => `°${u}`}
          />
          <Divider/>
          <UnitRow
            label="Wind"
            options={['km/h', 'mph', 'm/s'] as UnitWind[]}
            active={prefs.unitWind}
            onChange={v => updatePrefs({ unitWind: v })}
          />
        </Card>

        {/* Connections */}
        <SectionTitle title="Connections"/>
        <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('Connections')}>
          <Card tone="surface1" padded={false}>
            <View style={[styles.row, { paddingVertical: 14 }]}>
              <View style={[styles.toggleIcon, { backgroundColor: tk.surface2 }]}>
                <Icon name="bolt" size={18} color={tk.onSurface}/>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.rowLabel, { color: tk.onSurface }]}>Strava, Health Connect, Spotify…</Text>
                <Text style={{ color: tk.onSurfaceVar, fontSize: 12, marginTop: 1 }}>
                  {connectedCount > 0
                    ? `${connectedCount} connected · auto-log runs`
                    : 'Auto-log runs, sync playlists'}
                </Text>
              </View>
              <Icon name="chevron" size={18} color={tk.onSurfaceVar}/>
            </View>
          </Card>
        </TouchableOpacity>

        {/* API Key */}
        <SectionTitle title="WeatherAPI key"/>
        <Card tone="surface1">
          <TextInput
            style={[styles.input, { color: tk.onSurface, borderColor: tk.outline, backgroundColor: tk.surface2 }]}
            placeholder="Paste your API key here"
            placeholderTextColor={tk.onSurfaceVar}
            value={apiKey}
            onChangeText={setApiKey}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            onBlur={() => apiKey !== prefs.weatherApiKey && updatePrefs({ weatherApiKey: apiKey.trim() })}
          />
          <Text style={{ color: tk.onSurfaceVar, fontSize: 12, marginTop: 8 }}>
            Free at weatherapi.com · 1,000,000 calls/month on free plan
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function ThresholdSlider({
  icon, label, value, min, max, step, current, onChange,
}: {
  icon: IconName; label: string; value: string;
  min: number; max: number; step: number; current: number;
  onChange: (v: number) => void;
}) {
  const tk = useTokens();
  return (
    <View style={{ paddingHorizontal: 18, paddingVertical: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={[styles.toggleIcon, { backgroundColor: tk.surface2 }]}>
          <Icon name={icon} size={18} color={tk.onSurface}/>
        </View>
        <Text style={{ flex: 1, color: tk.onSurface, fontSize: 14, fontWeight: '600' }}>{label}</Text>
        <Text style={{ color: tk.accent, fontSize: 14, fontWeight: '700' }}>{value}</Text>
      </View>
      <Slider
        style={{ marginLeft: 48, marginTop: 2 }}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={current}
        onValueChange={onChange}
        minimumTrackTintColor={tk.accent}
        maximumTrackTintColor={tk.surface3}
        thumbTintColor={tk.accent}
      />
    </View>
  );
}

function ToggleRow({ icon, label, sub, value, onToggle }: {
  icon: IconName; label: string; sub: string; value: boolean; onToggle: (v: boolean) => void;
}) {
  const tk = useTokens();
  return (
    <View style={styles.row}>
      <View style={[styles.toggleIcon, { backgroundColor: tk.surface2 }]}>
        <Icon name={icon} size={18} color={tk.onSurface}/>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.rowLabel, { color: tk.onSurface }]}>{label}</Text>
        <Text style={{ color: tk.onSurfaceVar, fontSize: 12, marginTop: 1 }}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: tk.surface3, true: tk.accent }}
        thumbColor="#fff"
      />
    </View>
  );
}

function UnitRow<T extends string>({
  label, options, active, onChange, labelOf,
}: {
  label: string; options: T[]; active: T; onChange: (v: T) => void; labelOf?: (v: T) => string;
}) {
  const tk = useTokens();
  return (
    <View style={[styles.row, { paddingVertical: 12 }]}>
      <Text style={[styles.rowLabel, { color: tk.onSurface, flex: 1 }]}>{label}</Text>
      <View style={[styles.unitGroup, { backgroundColor: tk.surface2 }]}>
        {options.map(o => {
          const isActive = o === active;
          return (
            <TouchableOpacity
              key={o}
              onPress={() => onChange(o)}
              style={[styles.unitPill, isActive && { backgroundColor: tk.surface }]}
            >
              <Text style={{
                color: isActive ? tk.onSurface : tk.onSurfaceVar,
                fontSize: 12,
                fontWeight: isActive ? '700' : '500',
              }}>
                {labelOf ? labelOf(o) : o}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function Divider() {
  const tk = useTokens();
  return <View style={{ height: 1, backgroundColor: tk.outline, marginLeft: 18 + 36 + 12 }}/>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 60, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 18, paddingVertical: 14 },
  rowLabel: { fontSize: 14, fontWeight: '600' },
  toggleIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  swatch: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  input: {
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 15,
  },
  findBtn: {
    paddingHorizontal: 18, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  outlineBtn: {
    height: 48, borderRadius: 14, borderWidth: 1.5,
    flexDirection: 'row', gap: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  unitGroup: { flexDirection: 'row', padding: 2, borderRadius: 10, gap: 2 },
  unitPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
});
