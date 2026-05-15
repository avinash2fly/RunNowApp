import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, Platform, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { usePreferences, useTokens } from '../store/PreferencesContext';
import { Icon, IconName } from '../components/Icon';
import { Card } from '../components/Card';
import { TopBar } from '../components/TopBar';
import { SectionTitle } from '../components/SectionTitle';

const STRAVA = '#FC4C02';

function StravaMark({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M10 4 L4 16 L8 16 L10 12 L12 16 L16 16 L10 4Z" fill={color}/>
      <Path d="M14 14 L17 20 L20 14 L18 14 L17 16 L16 14 Z" fill={color} opacity={0.55}/>
    </Svg>
  );
}

export default function ConnectionsScreen() {
  const navigation = useNavigation();
  const { prefs, updatePrefs } = usePreferences();
  const tk = useTokens();

  const isIOS = Platform.OS === 'ios';

  const disconnectStrava = () => {
    Alert.alert('Disconnect Strava?', 'We\'ll stop importing runs from Strava.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: () => updatePrefs({ stravaConnected: false }) },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tk.surface }]} edges={['top', 'left', 'right']}>
      <View style={{ paddingHorizontal: 16 }}>
        <TopBar
          title="Connections"
          leading="chevronL"
          onLead={() => navigation.goBack()}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Strava hero */}
        {prefs.stravaConnected ? (
          <Card tone="surface1" padded={false} style={{ overflow: 'hidden' }}>
            <View style={[styles.stravaBanner, { backgroundColor: STRAVA }]}>
              <View style={styles.stravaBubble1}/>
              <View style={styles.stravaBubble2}/>
              <View style={styles.stravaRow}>
                <View style={[styles.stravaIcon, { backgroundColor: '#fff' }]}>
                  <StravaMark color={STRAVA} size={22}/>
                </View>
                <View>
                  <Text style={styles.stravaTitle}>Strava</Text>
                  <Text style={styles.stravaSub}>alex.runs · synced 4 min ago</Text>
                </View>
                <View style={styles.statusPill}>
                  <View style={styles.statusDot}/>
                  <Text style={styles.statusText}>CONNECTED</Text>
                </View>
              </View>
            </View>

            <View style={{ padding: 18 }}>
              <Text style={[styles.miniLabel, { color: tk.onSurfaceVar }]}>WHAT WE DO WITH YOUR DATA</Text>
              <View style={{ marginTop: 10, gap: 10 }}>
                <SyncRow dir="in" text="Pull runs to mark windows as ON TIME / DELAYED"/>
                <SyncRow dir="in" text="Use pace history to suggest realistic distances"/>
                <SyncRow dir="out" text="Push scheduled runs as planned activities"/>
              </View>
            </View>

            <View style={[styles.autoImport, { borderTopColor: tk.outline }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: tk.onSurface, fontSize: 13, fontWeight: '600' }}>Auto-import new runs</Text>
                <Text style={{ color: tk.onSurfaceVar, fontSize: 11, marginTop: 1 }}>Within 1 hour of finishing</Text>
              </View>
              <Switch
                value={prefs.stravaAutoImport}
                onValueChange={v => updatePrefs({ stravaAutoImport: v })}
                trackColor={{ false: tk.surface3, true: tk.accent }}
                thumbColor="#fff"
              />
            </View>
          </Card>
        ) : (
          <Card tone="surface1" padded={false} style={{ overflow: 'hidden' }}>
            <View style={[styles.stravaBanner, { backgroundColor: STRAVA }]}>
              <View style={styles.stravaBubble1}/>
              <View style={styles.stravaBubble2}/>
              <View style={styles.stravaRow}>
                <View style={[styles.stravaIcon, { backgroundColor: '#fff' }]}>
                  <StravaMark color={STRAVA} size={22}/>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stravaTitle}>Connect Strava</Text>
                  <Text style={styles.stravaSub}>Pull runs · match windows · push plans</Text>
                </View>
              </View>
            </View>
            <View style={{ padding: 18, gap: 12 }}>
              <Text style={[styles.miniLabel, { color: tk.onSurfaceVar }]}>WHY CONNECT</Text>
              <SyncRow dir="in" text="Auto-log runs from Strava — no manual entry"/>
              <SyncRow dir="in" text="Match each run to a scheduled window"/>
              <SyncRow dir="out" text="Push planned runs as Strava activities"/>
              <TouchableOpacity
                style={[styles.connectBtn, { backgroundColor: STRAVA }]}
                onPress={() => updatePrefs({ stravaConnected: true })}
                activeOpacity={0.85}
              >
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Connect Strava</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Recently synced (mock) */}
        {prefs.stravaConnected && (
          <>
            <SectionTitle title="Recently synced"/>
            <Card tone="surface1" padded={false}>
              {[
                { date: 'Tue, May 7', run: '6.2 km · 32:14', match: 'go',   note: 'Matched 5:30 PM window' },
                { date: 'Sun, May 5', run: '10.4 km · 56:08', match: 'go',  note: 'Matched 7:00 AM window' },
                { date: 'Fri, May 3', run: '5.1 km · 27:30', match: 'wait', note: 'Delayed 22 min' },
              ].map((s, i, arr) => (
                <React.Fragment key={i}>
                  <View style={styles.syncRow}>
                    <View style={[styles.syncIcon, {
                      backgroundColor: s.match === 'go' ? tk.goSoft : tk.waitSoft,
                    }]}>
                      <Icon
                        name={s.match === 'go' ? 'check' : 'history'}
                        size={16}
                        color={s.match === 'go' ? tk.go : tk.wait}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: tk.onSurface, fontSize: 13, fontWeight: '600' }}>{s.run}</Text>
                      <Text style={{ color: tk.onSurfaceVar, fontSize: 11, marginTop: 1 }}>
                        {s.date} · {s.note}
                      </Text>
                    </View>
                  </View>
                  {i < arr.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: tk.outline }]}/>
                  )}
                </React.Fragment>
              ))}
            </Card>
          </>
        )}

        {/* Other services */}
        <SectionTitle title="Other services"/>
        <View style={{ gap: 8 }}>
          <ServiceRow
            name="Health Connect"
            sub="Google's on-device hub · recommended"
            iconBg="#34A853"
            iconChar="❤"
            connected={prefs.healthConnectConnected}
            onToggle={() => updatePrefs({ healthConnectConnected: !prefs.healthConnectConnected })}
          />
          <ServiceRow
            name="Garmin Connect"
            sub="Watches & Edge devices"
            iconBg="#000000"
            iconChar="G"
            connected={prefs.garminConnected}
            onToggle={() => updatePrefs({ garminConnected: !prefs.garminConnected })}
          />
          <ServiceRow
            name="Apple Health"
            sub={isIOS ? 'Sync activity from Apple Health' : 'If you switch ecosystems'}
            iconBg="#FF2D55"
            iconChar="♥"
            disabled={!isIOS}
            disabledLabel="iOS only"
            connected={false}
            onToggle={() => {}}
          />
          <ServiceRow
            name="Spotify"
            sub="Auto-start your run playlist"
            iconBg="#1DB954"
            iconChar="♪"
            connected={prefs.spotifyConnected}
            onToggle={() => updatePrefs({ spotifyConnected: !prefs.spotifyConnected })}
          />
        </View>

        {/* Footer actions */}
        <View style={styles.footerRow}>
          <TouchableOpacity style={[styles.footerBtn, { borderColor: tk.outlineStrong }]}>
            <Icon name="lock" size={16} color={tk.onSurface}/>
            <Text style={{ color: tk.onSurface, fontSize: 13, fontWeight: '600' }}>Privacy settings</Text>
          </TouchableOpacity>
          {prefs.stravaConnected && (
            <TouchableOpacity
              style={[styles.footerBtn, { borderColor: tk.skip }]}
              onPress={disconnectStrava}
            >
              <Text style={{ color: tk.skip, fontSize: 13, fontWeight: '600' }}>Disconnect Strava</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SyncRow({ dir, text }: { dir: 'in' | 'out'; text: string }) {
  const tk = useTokens();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={[styles.syncDir, {
        backgroundColor: dir === 'in' ? tk.goSoft : tk.accentSoft,
      }]}>
        <Text style={{
          color: dir === 'in' ? tk.go : tk.accent,
          fontSize: 13, fontWeight: '800',
        }}>{dir === 'in' ? '↓' : '↑'}</Text>
      </View>
      <Text style={{ color: tk.onSurface, fontSize: 13, flex: 1, lineHeight: 18 }}>{text}</Text>
    </View>
  );
}

function ServiceRow({
  name, sub, iconBg, iconChar, connected, onToggle, disabled, disabledLabel,
}: {
  name: string; sub: string; iconBg: string; iconChar: string;
  connected: boolean; onToggle: () => void;
  disabled?: boolean; disabledLabel?: string;
}) {
  const tk = useTokens();
  return (
    <View style={{ opacity: disabled ? 0.55 : 1 }}>
      <Card tone="surface1" padded={false} style={styles.serviceCard}>
        <View style={[styles.serviceIcon, { backgroundColor: iconBg }]}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>{iconChar}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: tk.onSurface, fontSize: 14, fontWeight: '600' }}>{name}</Text>
          <Text style={{ color: tk.onSurfaceVar, fontSize: 11, marginTop: 1 }}>{sub}</Text>
        </View>
        <TouchableOpacity
          onPress={onToggle}
          disabled={disabled}
          style={[styles.servicePill, {
            backgroundColor: disabled ? tk.surface3 : connected ? tk.surface2 : tk.accent,
            borderWidth: connected && !disabled ? 1 : 0,
            borderColor: tk.outlineStrong,
          }]}
        >
          <Text style={{
            color: disabled ? tk.onSurfaceVar : connected ? tk.onSurface : tk.onAccent,
            fontSize: 12, fontWeight: '700',
          }}>
            {disabled ? (disabledLabel ?? 'Unavailable') : connected ? 'Connected' : 'Connect'}
          </Text>
        </TouchableOpacity>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 60, gap: 10 },
  stravaBanner: { height: 88, position: 'relative', overflow: 'hidden' },
  stravaBubble1: {
    position: 'absolute', top: -20, right: -20, width: 140, height: 140,
    borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.12)',
  },
  stravaBubble2: {
    position: 'absolute', bottom: -40, right: 30, width: 90, height: 90,
    borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.08)',
  },
  stravaRow: {
    padding: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  stravaIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  stravaTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  stravaSub: { color: '#fff', fontSize: 11, opacity: 0.85 },
  statusPill: {
    marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 999,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#7FE08C' },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  miniLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  autoImport: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, paddingHorizontal: 18, borderTopWidth: 1,
  },
  connectBtn: {
    height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 18 },
  syncIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  syncDir: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, marginHorizontal: 18 },
  serviceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, paddingHorizontal: 14,
  },
  serviceIcon: {
    width: 38, height: 38, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  servicePill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18 },
  footerRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  footerBtn: {
    flex: 1, height: 46, borderRadius: 23, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
});
