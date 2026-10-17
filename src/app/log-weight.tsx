import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Text } from 'react-native';

import { Button, Card, Field, parseNum, Row, Screen, styles } from '../components/ui';
import { weightOn } from '../lib/calc';
import { friendlyDate, todayKey } from '../lib/dates';
import { WEIGH_IN_TIP } from '../lib/photos';
import { useProfile, useStore } from '../lib/store';

export default function LogWeight() {
  const params = useLocalSearchParams<{ date?: string }>();
  const date = params.date ?? todayKey();
  const { state, setWeight } = useStore();
  const profile = useProfile();
  const existing = state.weights.find((w) => w.date === date);
  const last = weightOn(state.weights, date, profile.startWeightKg);
  const [kg, setKg] = useState(String(existing?.kg ?? last).replace('.', ','));
  const [waist, setWaist] = useState(existing?.waistCm ? String(existing.waistCm) : '');
  const [bodyFat, setBodyFat] = useState(existing?.bodyFatPct ? String(existing.bodyFatPct) : '');

  const save = () => {
    const value = parseNum(kg);
    if (!(value > 30 && value < 350)) return Alert.alert('Težina', 'Unesi ispravnu težinu u kg.');
    const w = waist.trim() ? parseNum(waist) : undefined;
    const bf = bodyFat.trim() ? parseNum(bodyFat) : undefined;
    setWeight({ date, kg: value, waistCm: w && w > 0 ? w : undefined, bodyFatPct: bf && bf > 0 ? bf : undefined });
    router.back();
  };

  return (
    <Screen>
      <Text style={styles.muted}>Datum: {friendlyDate(date)}</Text>
      <Card>
        <Field label="Težina" suffix="kg" value={kg} onChangeText={setKg} keyboardType="decimal-pad" autoFocus selectTextOnFocus />
        <Row>
          <Field label="Opseg struka (opcionalno)" suffix="cm" value={waist} onChangeText={setWaist} keyboardType="decimal-pad" />
          <Field label="% masti (opcionalno)" suffix="%" value={bodyFat} onChangeText={setBodyFat} keyboardType="decimal-pad" />
        </Row>
        <Text style={styles.muted}>{WEIGH_IN_TIP}</Text>
      </Card>
      <Button title="Spremi" onPress={save} />
    </Screen>
  );
}
