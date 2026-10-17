import { Alert, Text } from 'react-native';

import { ProfileForm } from '../../components/ProfileForm';
import { Button, Card, Screen, styles } from '../../components/ui';
import { weightOn } from '../../lib/calc';
import { todayKey } from '../../lib/dates';
import { useProfile, useStore } from '../../lib/store';

export default function ProfileScreen() {
  const { state, setProfile, reset } = useStore();
  const profile = useProfile();
  const current = weightOn(state.weights, todayKey(), profile.startWeightKg);

  return (
    <Screen>
      <ProfileForm
        initial={profile}
        currentWeightKg={current}
        submitLabel="Spremi profil"
        onSubmit={(p) => {
          setProfile(p);
          Alert.alert('Spremljeno', 'Ciljevi su ažurirani.');
        }}
      />
      <Card title="Podaci">
        <Text style={styles.muted}>
          Unosa hrane: {state.diary.length} · vaganja: {state.weights.length} · spremljenih namirnica:{' '}
          {Object.keys(state.foods).length}
        </Text>
        <Text style={styles.muted}>Svi podaci spremaju se samo na ovom uređaju.</Text>
        <Button
          title="Obriši sve podatke"
          variant="danger"
          onPress={() =>
            Alert.alert('Obrisati sve?', 'Ovo briše profil, dnevnik i povijest težine. Ne može se poništiti.', [
              { text: 'Odustani', style: 'cancel' },
              { text: 'Obriši', style: 'destructive', onPress: reset },
            ])
          }
        />
      </Card>
    </Screen>
  );
}
