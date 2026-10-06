import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';

export type TrustedContact = {
  id: string;
  name: string;
  contact: string;
};

type SafeCircleSheetProps = {
  visible: boolean;
  contacts: TrustedContact[];
  storageError?: string | null;
  onClose: () => void;
  onAdd: (name: string, contact: string) => Promise<boolean>;
  onRemove: (id: string) => Promise<void>;
  onShare: () => Promise<void>;
};

export function SafeCircleSheet({
  visible,
  contacts,
  storageError,
  onClose,
  onAdd,
  onRemove,
  onShare,
}: SafeCircleSheetProps) {
  const colors = useColors();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    Keyboard.dismiss();
    const cleanName = name.trim();
    const cleanContact = contact.trim();
    if (!cleanName || !cleanContact) {
      setFormError('Add a name and a phone number or email.');
      return;
    }
    setSaving(true);
    setFormError('');
    const added = await onAdd(cleanName, cleanContact);
    setSaving(false);
    if (added) {
      setName('');
      setContact('');
      setFormError('');
    } else {
      setFormError('Could not save this contact. Please try again.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityLabel="Close SafeCircle"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView
          edges={['bottom']}
          style={[styles.sheet, { backgroundColor: colors.background }]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: colors.safeTint }]}>
              <Ionicons name="people-outline" size={21} color={colors.routeSafe} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={[styles.title, { color: colors.foreground }]}>Your SafeCircle</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                People you can choose to share a trip with
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close SafeCircle"
              onPress={onClose}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={22} color={colors.foreground} />
            </Pressable>
          </View>
          <KeyboardAwareScrollViewCompat
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            bottomOffset={24}
          >
            {storageError ? (
              <View style={[styles.errorBanner, { backgroundColor: colors.destructiveTint }]}>
                <Ionicons name="alert-circle-outline" size={17} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{storageError}</Text>
              </View>
            ) : null}
            <View style={[styles.shareCard, { backgroundColor: colors.deepGreen }]}>
              <View style={styles.shareCopy}>
                <Text style={[styles.shareTitle, { color: colors.primaryForeground }]}>On a trip now?</Text>
                <Text style={[styles.shareSubtitle, { color: colors.onDarkMuted }]}>
                  Open your phone’s share sheet and choose a person or app.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                testID="share-trip-button"
                onPress={onShare}
                style={({ pressed }) => [
                  styles.shareButton,
                  { backgroundColor: colors.lime, opacity: pressed ? 0.82 : 1 },
                ]}
              >
                <Ionicons name="share-outline" size={17} color={colors.deepGreen} />
                <Text style={[styles.shareButtonText, { color: colors.deepGreen }]}>Share trip</Text>
              </Pressable>
            </View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Trusted contacts
            </Text>
            {contacts.length ? (
              <View style={styles.contactList}>
                {contacts.map((item) => (
                  <View
                    key={item.id}
                    style={[styles.contactRow, { borderBottomColor: colors.border }]}
                  >
                    <View style={[styles.avatar, { backgroundColor: colors.safeTint }]}>
                      <Text style={[styles.avatarText, { color: colors.routeSafe }]}>
                        {item.name.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.contactCopy}>
                      <Text style={[styles.contactName, { color: colors.foreground }]}>{item.name}</Text>
                      <Text style={[styles.contactDetail, { color: colors.mutedForeground }]}>
                        {item.contact}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${item.name}`}
                      onPress={() => void onRemove(item.id)}
                      hitSlop={10}
                      style={styles.removeButton}
                    >
                      <Ionicons name="close-circle-outline" size={20} color={colors.mutedForeground} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <View style={[styles.emptyState, { borderColor: colors.border }]}>
                <Ionicons name="person-add-outline" size={20} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  No trusted contacts saved yet.
                </Text>
              </View>
            )}
            <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 21 }]}>
              Add someone
            </Text>
            <TextInput
              accessibilityLabel="Contact name"
              testID="trusted-contact-name"
              value={name}
              onChangeText={setName}
              placeholder="Name"
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="next"
              style={[
                styles.input,
                {
                  color: colors.foreground,
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            />
            <TextInput
              accessibilityLabel="Phone number or email"
              testID="trusted-contact-detail"
              value={contact}
              onChangeText={setContact}
              placeholder="Phone number or email"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={() => void handleAdd()}
              style={[
                styles.input,
                {
                  color: colors.foreground,
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            />
            {formError ? (
              <Text style={[styles.formError, { color: colors.destructive }]}>{formError}</Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              testID="add-trusted-contact"
              disabled={saving}
              onPress={() => void handleAdd()}
              style={({ pressed }) => [
                styles.addButton,
                {
                  backgroundColor: colors.primary,
                  opacity: saving || pressed ? 0.74 : 1,
                },
              ]}
            >
              <Ionicons name="add" size={18} color={colors.primaryForeground} />
              <Text style={[styles.addButtonText, { color: colors.primaryForeground }]}>
                {saving ? 'Saving…' : 'Add to SafeCircle'}
              </Text>
            </Pressable>
            <View style={[styles.disclosure, { backgroundColor: colors.secondary }]}>
              <Ionicons name="lock-closed-outline" size={15} color={colors.mutedForeground} />
              <Text style={[styles.disclosureText, { color: colors.mutedForeground }]}>
                Contacts stay on this device. Sharing is manual—this demo does not send alerts or track trips automatically.
              </Text>
            </View>
          </KeyboardAwareScrollViewCompat>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(10, 24, 18, 0.45)',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: 20,
    height: '91%',
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 17,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 18,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 19,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  closeButton: {
    padding: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 25,
  },
  shareCard: {
    borderRadius: 19,
    padding: 15,
    gap: 12,
  },
  shareCopy: {
    gap: 5,
  },
  shareTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  shareSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 16,
  },
  shareButton: {
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 12,
  },
  shareButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    marginTop: 19,
    marginBottom: 10,
  },
  contactList: {
    gap: 2,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  contactCopy: {
    flex: 1,
    gap: 3,
  },
  contactName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  contactDetail: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
  },
  removeButton: {
    padding: 5,
  },
  emptyState: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 15,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  emptyText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 13,
    marginBottom: 9,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  formError: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    marginBottom: 9,
  },
  addButton: {
    borderRadius: 13,
    paddingVertical: 13,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  disclosure: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 13,
    padding: 12,
    marginTop: 14,
  },
  disclosureText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    lineHeight: 15,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
});
