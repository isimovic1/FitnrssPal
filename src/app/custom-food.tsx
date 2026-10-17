import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Text } from 'react-native';

import { Button, Card, Field, parseNum, Row, Screen, styles } from '../components/ui';
import { todayKey } from '../lib/dates';
import { newId, useStore } from '../lib/store';
import type { Food, MealType } from '../lib/types';

export default function CustomFood() {
  const params = useLocalSearchParams<{ date?: string; meal?: MealType; barcode?: string }>();
  const { saveFood } = useStore();
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [barcode, setBarcode] = useState(params.barcode ?? '');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [sugar, setSugar] = useState('');
  const [fiber, setFiber] = useState('');
  const [salt, setSalt] = useState('');
  const [serving, setServing] = useState('');

  const opt = (s: string) => (s.trim() ? parseNum(s) : undefined);

  const submit = () => {
    const k = parseNum(kcal);
    if (!name.trim()) return Alert.alert('Nedostaje naziv', 'Upiši naziv namirnice.');
    if (!(k >= 0 && k <= 950)) return Alert.alert('Kalorije', 'Unesi kalorije na 100 g (0–950).');
    const servingG = opt(serving);
    const food: Food = {
      id: barcode.trim() ? `custom:${barcode.trim()}` : `custom:${newId()}`,
      name: name.trim(),
      brand: brand.trim() || undefined,
      barcode: barcode.trim() || undefined,
      per100g: {
        kcal: k,
        protein: opt(protein) ?? 0,
        carbs: opt(carbs) ?? 0,
        fat: opt(fat) ?? 0,
        sugar: opt(sugar),
        fiber: opt(fiber),
        salt: opt(salt),
      },
      servingSizeG: servingG && servingG > 0 ? servingG : undefined,
      source: 'custom',
    };
    saveFood(food);
    router.replace({ pathname: '/food', params: { foodId: food.id, date: params.date ?? todayKey(), meal: params.meal ?? 'snack' } });
  };

  return (
    <Screen>
      <Card title="Osnovno">
        <Field label="Naziv" value={name} onChangeText={setName} />
        <Field label="Proizvođač (nije obavezno)" value={brand} onChangeText={setBrand} />
        <Field label="Bar-kod (nije obavezno)" value={barcode} onChangeText={setBarcode} keyboardType="number-pad" />
        <Field label="Veličina porcije (nije obavezno)" suffix="g" value={serving} onChangeText={setServing} keyboardType="decimal-pad" />
      </Card>
      <Card title="Na 100 g (s etikete)">
        <Field label="Energija" suffix="kcal" value={kcal} onChangeText={setKcal} keyboardType="decimal-pad" />
        <Row>
          <Field label="Proteini" suffix="g" value={protein} onChangeText={setProtein} keyboardType="decimal-pad" />
          <Field label="Ugljikohidrati" suffix="g" value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" />
        </Row>
        <Row>
          <Field label="Masti" suffix="g" value={fat} onChangeText={setFat} keyboardType="decimal-pad" />
          <Field label="Šećeri" suffix="g" value={sugar} onChangeText={setSugar} keyboardType="decimal-pad" />
        </Row>
        <Row>
          <Field label="Vlakna" suffix="g" value={fiber} onChangeText={setFiber} keyboardType="decimal-pad" />
          <Field label="Sol" suffix="g" value={salt} onChangeText={setSalt} keyboardType="decimal-pad" />
        </Row>
        <Text style={styles.muted}>Ako etiketa ima samo kJ, podijeli s 4,184.</Text>
      </Card>
      <Button title="Spremi i nastavi" onPress={submit} />
    </Screen>
  );
}
