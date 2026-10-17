import Ionicons from '@expo/vector-icons/Ionicons';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/ui';
import { todayKey } from '../lib/dates';
import { findByBarcode, rememberFood } from '../lib/foodCache';
import { extractBarcode, lookupBarcode } from '../lib/openFoodFacts';
import { useStore } from '../lib/store';
import type { MealType } from '../lib/types';
import { colors, spacing } from '../theme';

export default function Scan() {
  const params = useLocalSearchParams<{ date?: string; meal?: MealType }>();
  const date = params.date ?? todayKey();
  const meal = params.meal ?? 'snack';
  const { state } = useStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [torch, setTorch] = useState(false);
  const [manual, setManual] = useState('');
  // Camera fires many events per second; only handle one code at a time.
  const handling = useRef(false);

  const handleCode = async (raw: string) => {
    if (handling.current) return;
    handling.current = true;
    const barcode = extractBarcode(raw);
    if (!barcode) {
      Alert.alert('Nepoznat kod', 'Ovaj kod ne sadrži bar-kod proizvoda.', [
        { text: 'U redu', onPress: () => (handling.current = false) },
      ]);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    const goToFood = (foodId: string) => router.replace({ pathname: '/food', params: { foodId, date, meal } });
    const known = findByBarcode(state, barcode);
    if (known) {
      goToFood(known.id);
      return;
    }

    setBusy(true);
    const result = await lookupBarcode(barcode);
    setBusy(false);
    if (result.status === 'found') {
      rememberFood(result.food);
      goToFood(result.food.id);
      return;
    }
    const message =
      result.status === 'error'
        ? `Nije moguće dohvatiti podatke (${result.message}). Provjeri internetsku vezu.`
        : result.status === 'incomplete'
          ? `Proizvod${result.name ? ` "${result.name}"` : ''} je u bazi, ali bez nutritivnih vrijednosti.`
          : 'Proizvod nije pronađen u bazi Open Food Facts.';
    Alert.alert('Proizvod nije pronađen', `Bar-kod: ${barcode}\n${message}\n\nMožeš ga sam unijeti s etikete — sljedeći put će se prepoznati odmah.`, [
      { text: 'Skeniraj ponovo', style: 'cancel', onPress: () => (handling.current = false) },
      {
        text: 'Unesi ručno',
        onPress: () => router.replace({ pathname: '/custom-food', params: { date, meal, barcode } }),
      },
    ]);
  };

  const onScanned = (r: BarcodeScanningResult) => {
    if (!busy) handleCode(r.data);
  };

  if (!permission) return <View style={s.black} />;

  return (
    <View style={s.black}>
      {permission.granted ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'] }}
          onBarcodeScanned={busy ? undefined : onScanned}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', padding: spacing.xl, gap: spacing.md }]}>
          <Text style={s.white}>Za skeniranje bar-koda potreban je pristup kameri.</Text>
          <Button title="Dopusti kameru" onPress={requestPermission} />
        </View>
      )}

      <SafeAreaView style={s.overlay} pointerEvents="box-none">
        <View style={s.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={30} color="#fff" />
          </Pressable>
          <Text style={[s.white, { fontWeight: '700' }]}>Skeniraj bar-kod ili QR</Text>
          <Pressable onPress={() => setTorch((t) => !t)} hitSlop={12}>
            <Ionicons name={torch ? 'flash' : 'flash-outline'} size={26} color="#fff" />
          </Pressable>
        </View>

        {permission.granted && (
          <View style={s.frameWrap} pointerEvents="none">
            <View style={s.frame} />
            <Text style={[s.white, { marginTop: spacing.md, opacity: 0.85 }]}>Usmjeri kameru na bar-kod proizvoda</Text>
          </View>
        )}

        <View style={s.bottom}>
          {busy ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <View style={s.manualRow}>
              <TextInput
                value={manual}
                onChangeText={setManual}
                placeholder="ili upiši bar-kod"
                placeholderTextColor="#aaa"
                keyboardType="number-pad"
                style={s.manualInput}
                onSubmitEditing={() => manual && handleCode(manual)}
              />
              <Button title="Traži" onPress={() => handleCode(manual)} disabled={!manual} style={{ paddingVertical: 10 }} />
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  black: { flex: 1, backgroundColor: '#000' },
  white: { color: '#fff', fontSize: 16, textAlign: 'center' },
  overlay: { ...StyleSheet.absoluteFill, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  frameWrap: { alignItems: 'center' },
  frame: { width: 280, height: 170, borderWidth: 3, borderColor: '#fff', borderRadius: 16 },
  bottom: { padding: spacing.lg, minHeight: 90, justifyContent: 'center' },
  manualRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  manualInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 16,
  },
});
