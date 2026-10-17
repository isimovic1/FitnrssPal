import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text } from 'react-native';

import { Button, Card, Field, fmt, parseNum, Row, Screen, styles } from '../components/ui';
import { weightOn } from '../lib/calc';
import { todayKey } from '../lib/dates';
import { EXERCISES, exerciseKcal } from '../lib/exercises';
import { useProfile, useStore } from '../lib/store';
import { colors, spacing } from '../theme';

export default function AddExercise() {
  const params = useLocalSearchParams<{ date?: string }>();
  const date = params.date ?? todayKey();
  const { state, addExercise } = useStore();
  const profile = useProfile();
  const weight = weightOn(state.weights, date, profile.startWeightKg);
  const [selected, setSelected] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [minutes, setMinutes] = useState('30');
  const [kcal, setKcal] = useState('');

  const mins = parseNum(minutes);
  const estimate = selected !== null && mins > 0 ? exerciseKcal(EXERCISES[selected].met, weight, mins) : null;

  const save = () => {
    const finalKcal = kcal.trim() ? parseNum(kcal) : estimate;
    const finalName = selected !== null ? EXERCISES[selected].name : name.trim();
    if (!finalName) return Alert.alert('Aktivnost', 'Odaberi aktivnost ili upiši naziv.');
    if (!(mins > 0)) return Alert.alert('Trajanje', 'Unesi trajanje u minutama.');
    if (finalKcal === null || !(finalKcal >= 0)) return Alert.alert('Kalorije', 'Unesi potrošene kalorije.');
    addExercise({ date, name: finalName, minutes: Math.round(mins), kcal: Math.round(finalKcal) });
    router.back();
  };

  return (
    <Screen>
      <Card title="Aktivnost">
        <Row style={{ flexWrap: 'wrap', gap: spacing.sm }}>
          {EXERCISES.map((e, i) => (
            <Pressable
              key={e.name}
              onPress={() => setSelected(selected === i ? null : i)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: selected === i ? colors.primary : colors.primarySoft,
              }}
            >
              <Text style={{ color: selected === i ? '#fff' : colors.primary, fontWeight: '600' }}>{e.name}</Text>
            </Pressable>
          ))}
        </Row>
        {selected === null && <Field label="Ili upiši naziv" value={name} onChangeText={setName} />}
      </Card>
      <Card>
        <Row>
          <Field label="Trajanje" suffix="min" value={minutes} onChangeText={setMinutes} keyboardType="number-pad" />
          <Field
            label="Kalorije"
            suffix="kcal"
            value={kcal}
            onChangeText={setKcal}
            placeholder={estimate !== null ? String(estimate) : ''}
            keyboardType="number-pad"
          />
        </Row>
        <Text style={styles.muted}>
          {estimate !== null
            ? `Procjena za ${fmt(weight, 1)} kg: ${estimate} kcal. Upiši vlastitu vrijednost ako je imaš sa sata.`
            : 'Odaberi aktivnost za automatsku procjenu ili upiši kalorije.'}
        </Text>
      </Card>
      <Button title="Dodaj" onPress={save} />
    </Screen>
  );
}
