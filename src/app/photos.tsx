import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';

import { Card, fmt, Row, Screen, Segmented, styles } from '../components/ui';
import { addDays, shortDate, startOfWeek, todayKey } from '../lib/dates';
import { comparePair, PHOTO_TIP, POSES } from '../lib/photos';
import { deletePhotoFile, storePhoto } from '../lib/photoStorage';
import { useStore } from '../lib/store';
import type { DateKey, PhotoPose } from '../lib/types';
import { colors, spacing } from '../theme';

export default function Photos() {
  const { state, setPhoto } = useStore();
  const thisWeek = startOfWeek(todayKey());
  const [week, setWeek] = useState(thisWeek);
  const [comparePose, setComparePose] = useState<PhotoPose>('front');
  const set = state.photos[week];
  const pair = comparePair(state.photos, comparePose);
  const weightAround = (w: DateKey) =>
    state.weights.find((x) => x.date >= w && x.date <= addDays(w, 6))?.kg;

  const pick = async (pose: PhotoPose, source: 'camera' | 'gallery') => {
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return Alert.alert('Kamera', 'Za slikanje je potreban pristup kameri.');
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };
      const result =
        source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets[0]) return;
      const uri = storePhoto(result.assets[0].uri, week, pose);
      deletePhotoFile(set?.[pose]);
      setPhoto(week, pose, uri);
    } catch (e) {
      Alert.alert('Spremanje slike nije uspjelo', e instanceof Error ? e.message : String(e));
    }
  };

  const onSlot = (pose: PhotoPose, label: string) => {
    const existing = set?.[pose];
    Alert.alert(`${label} · tjedan od ${shortDate(week)}`, undefined, [
      { text: 'Slikaj', onPress: () => pick(pose, 'camera') },
      { text: 'Iz galerije', onPress: () => pick(pose, 'gallery') },
      ...(existing
        ? [{
            text: 'Obriši',
            style: 'destructive' as const,
            onPress: () => {
              deletePhotoFile(existing);
              setPhoto(week, pose, undefined);
            },
          }]
        : []),
      { text: 'Odustani', style: 'cancel' as const },
    ]);
  };

  const weeks = Object.values(state.photos).sort((a, b) => b.week.localeCompare(a.week));

  return (
    <Screen>
      <Card style={{ backgroundColor: colors.primarySoft }}>
        <Row style={{ alignItems: 'flex-start' }}>
          <Ionicons name="bulb-outline" size={20} color={colors.primary} />
          <Text style={[styles.text, { flex: 1 }]}>{PHOTO_TIP}</Text>
        </Row>
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable onPress={() => setWeek(addDays(week, -7))} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </Pressable>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
            {week === thisWeek ? 'Ovaj tjedan' : 'Tjedan'} · {shortDate(week)} – {shortDate(addDays(week, 6))}
          </Text>
          <Pressable onPress={() => setWeek(addDays(week, 7))} hitSlop={12} disabled={week >= thisWeek}>
            <Ionicons name="chevron-forward" size={24} color={week >= thisWeek ? colors.border : colors.primary} />
          </Pressable>
        </Row>
        <Row style={{ alignItems: 'flex-start' }}>
          {POSES.map(({ pose, label }) => (
            <Pressable key={pose} onPress={() => onSlot(pose, label)} style={{ flex: 1, gap: 4 }}>
              <PhotoBox uri={set?.[pose]} />
              <Text style={[styles.muted, { textAlign: 'center', fontSize: 12 }]}>{label}</Text>
            </Pressable>
          ))}
        </Row>
        <Text style={[styles.muted, { fontSize: 12 }]}>Dodirni okvir za slikanje, odabir iz galerije ili brisanje.</Text>
      </Card>

      <Card title="Početak vs. sada">
        <Segmented options={POSES.map((p) => ({ value: p.pose, label: p.label }))} value={comparePose} onChange={setComparePose} />
        {pair ? (
          <Row style={{ alignItems: 'flex-start' }}>
            {[{ title: 'Početak', set: pair.first }, { title: 'Sada', set: pair.latest }].map(({ title, set: s }) => {
              const kg = weightAround(s.week);
              return (
                <View key={title} style={{ flex: 1, gap: 4 }}>
                  <PhotoBox uri={s[comparePose]} />
                  <Text style={[styles.text, { textAlign: 'center', fontWeight: '700' }]}>{title}</Text>
                  <Text style={[styles.muted, { textAlign: 'center', fontSize: 12 }]}>
                    {shortDate(s.week)}
                    {kg !== undefined ? ` · ${fmt(kg, 1)} kg` : ''}
                  </Text>
                </View>
              );
            })}
          </Row>
        ) : (
          <Text style={styles.muted}>Još nema slika za ovaj kut. Dodaj prve slike gore.</Text>
        )}
      </Card>

      {weeks.length > 0 && (
        <Card title="Svi tjedni">
          {weeks.map((w) => (
            <Pressable key={w.week} onPress={() => setWeek(w.week)} style={{ gap: 4, paddingVertical: 4 }}>
              <Text style={[styles.text, { fontWeight: '600' }]}>Tjedan od {shortDate(w.week)}</Text>
              <Row>
                {POSES.map(({ pose }) => (
                  <View key={pose} style={{ flex: 1 }}>
                    <PhotoBox uri={w[pose]} small />
                  </View>
                ))}
              </Row>
            </Pressable>
          ))}
        </Card>
      )}
    </Screen>
  );
}

function PhotoBox({ uri, small }: { uri?: string; small?: boolean }) {
  return (
    <View
      style={{
        aspectRatio: 3 / 4,
        borderRadius: small ? 6 : 10,
        backgroundColor: colors.bg,
        borderWidth: uri ? 0 : 1.5,
        borderStyle: 'dashed',
        borderColor: colors.border,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <Ionicons name="camera-outline" size={small ? 16 : 26} color={colors.muted} />
      )}
    </View>
  );
}
