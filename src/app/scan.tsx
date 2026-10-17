import Ionicons from '@expo/vector-icons/Ionicons';
import { BarcodeScanningResult, CameraView, scanFromURLAsync, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/ui';
import { todayKey } from '../lib/dates';
import { findByBarcode, rememberFood } from '../lib/foodCache';
import { extractBarcode, lookupBarcode } from '../lib/openFoodFacts';
import { useStore } from '../lib/store';
import type { MealType } from '../lib/types';
import { colors, spacing } from '../theme';

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'] as const;

// On Android the Google code scanner (Play Services) is far more reliable than
// analysing frames from our own camera view, so it is the default there.
const GOOGLE_SCANNER = Platform.OS === 'android' && CameraView.isModernBarcodeScannerAvailable;

type Mode = 'google' | 'camera';

export default function Scan() {
  const params = useLocalSearchParams<{ date?: string; meal?: MealType }>();
  const date = params.date ?? todayKey();
  const meal = params.meal ?? 'snack';
  const { state } = useStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [torch, setTorch] = useState(false);
  const [manual, setManual] = useState('');
  // Android starts on a chooser screen: the in-app camera view does not report
  // barcodes on some devices, so it is only used when picked explicitly.
  const [mode, setMode] = useState<Mode>(Platform.OS === 'android' ? 'google' : 'camera');
  const [googleOk, setGoogleOk] = useState(GOOGLE_SCANNER);
  // Why the Google scanner is not in use, shown small on the camera screen to help diagnose devices.
  const [fallbackReason, setFallbackReason] = useState(
    Platform.OS === 'android' && !GOOGLE_SCANNER ? 'Google skener nije dostupan na ovom uređaju' : '',
  );
  // Camera fires many events per second; only handle one code at a time.
  const handling = useRef(false);
  const release = () => (handling.current = false);

  const handleCode = async (raw: string) => {
    if (handling.current) return;
    handling.current = true;
    const barcode = extractBarcode(raw);
    if (!barcode) {
      Alert.alert('Nepoznat kod', `Pročitano: ${raw}\nOvaj kod ne sadrži bar-kod proizvoda.`, [{ text: 'U redu', onPress: release }], {
        onDismiss: release,
      });
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
      { text: 'Skeniraj ponovo', style: 'cancel', onPress: release },
      {
        text: 'Unesi ručno',
        onPress: () => router.replace({ pathname: '/custom-food', params: { date, meal, barcode } }),
      },
    ], { onDismiss: release });
  };

  const handleCodeRef = useRef(handleCode);
  handleCodeRef.current = handleCode;

  const launchGoogleScanner = async () => {
    try {
      await CameraView.launchScanner({ barcodeTypes: [...BARCODE_TYPES] });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (/cancel/i.test(message)) return;
      // No Play Services (or the scanner module failed): offer the photo options instead.
      setFallbackReason(`Google skener: ${message}`);
      setGoogleOk(false);
    }
  };

  // Fallback for devices where neither the Google scanner nor live frame
  // analysis works: take the photo with the phone's own camera app (or pick one
  // from the gallery) and let ML Kit look for a barcode in the still image.
  const scanPhoto = async (source: 'camera' | 'gallery') => {
    if (busy || handling.current) return;
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return Alert.alert('Kamera', 'Za slikanje bar-koda potreban je pristup kameri.');
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.9 };
      const picked =
        source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (picked.canceled || !picked.assets[0]) return;
      setBusy(true);
      const results = await scanFromURLAsync(picked.assets[0].uri, [...BARCODE_TYPES]);
      setBusy(false);
      if (results.length) handleCode(results[0].data);
      else Alert.alert('Bar-kod nije pronađen', 'Približi bar-kod da zauzme veći dio slike, izbjegni odsjaj i pokušaj ponovo.');
    } catch (e) {
      setBusy(false);
      Alert.alert('Skeniranje slike nije uspjelo', `${e instanceof Error ? e.message : String(e)}\n\nUpiši brojeve ispod bar-koda u polje na dnu.`);
    }
  };

  useEffect(() => {
    if (mode !== 'google' || !googleOk) return;
    const sub = CameraView.onModernBarcodeScanned((r) => handleCodeRef.current(r.data));
    launchGoogleScanner();
    return () => sub.remove();
    // Launch once per visit to the chooser, not again when googleOk flips to false.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const onScanned = (r: BarcodeScanningResult) => {
    if (!busy) handleCode(r.data);
  };

  const manualEntry = busy ? (
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
  );

  if (mode === 'google') {
    return (
      <SafeAreaView style={[s.black, { justifyContent: 'space-between' }]}>
        <View style={s.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={30} color="#fff" />
          </Pressable>
          <Text style={[s.white, { fontWeight: '700' }]}>Skeniraj bar-kod ili QR</Text>
          <View style={{ width: 30 }} />
        </View>
        <View style={{ padding: spacing.xl, gap: spacing.md, alignItems: 'center' }}>
          <Ionicons name="barcode-outline" size={96} color="#fff" />
          {googleOk && (
            <Button title="Skeniraj" onPress={launchGoogleScanner} disabled={busy} style={{ alignSelf: 'stretch' }} />
          )}
          <Button title="Slikaj bar-kod kamerom mobitela" variant={googleOk ? 'secondary' : 'primary'} onPress={() => scanPhoto('camera')} disabled={busy} style={{ alignSelf: 'stretch' }} />
          <Button title="Odaberi sliku iz galerije" variant="secondary" onPress={() => scanPhoto('gallery')} disabled={busy} style={{ alignSelf: 'stretch' }} />
          <Button title="Koristi kameru u aplikaciji" variant="ghost" onPress={() => setMode('camera')} />
        </View>
        <View style={[s.bottom, { gap: spacing.sm }]}>
          {manualEntry}
          {fallbackReason ? <Text style={s.hint}>{fallbackReason}</Text> : null}
        </View>
      </SafeAreaView>
    );
  }

  if (!permission) return <View style={s.black} />;

  return (
    <View style={s.black}>
      {permission.granted ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
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

        <View style={[s.bottom, { gap: spacing.sm }]}>
          {!busy && (
            <View style={s.manualRow}>
              <Button title="Slikaj bar-kod" onPress={() => scanPhoto('camera')} style={{ flex: 1, paddingVertical: 10 }} />
              <Button title="Iz galerije" variant="secondary" onPress={() => scanPhoto('gallery')} style={{ paddingVertical: 10 }} />
            </View>
          )}
          {manualEntry}
          {fallbackReason ? <Text style={s.hint}>{fallbackReason}</Text> : null}
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
  hint: { color: '#ffffff99', fontSize: 11, textAlign: 'center' },
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
