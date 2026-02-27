import { useRouter } from 'next/router'

import { signInWithGoogle, signOut } from '@flow/reader/firebase'
import {
  ColorScheme,
  useAuth,
  useColorScheme,
  useTranslation,
} from '@flow/reader/hooks'
import { useSettings } from '@flow/reader/state'

import { Button } from '../Button'
import { Checkbox, Select } from '../Form'
import { Page } from '../Page'

export const Settings: React.FC = () => {
  const { scheme, setScheme } = useColorScheme()
  const { asPath, push, locale } = useRouter()
  const [settings, setSettings] = useSettings()
  const t = useTranslation('settings')

  return (
    <Page headline={t('title')}>
      <div className="space-y-6">
        <Item title={t('language')}>
          <Select
            value={locale}
            onChange={(e) => {
              push(asPath, undefined, { locale: e.target.value })
            }}
          >
            <option value="en-US">English</option>
            <option value="zh-CN">简体中文</option>
            <option value="ja-JP">日本語</option>
          </Select>
        </Item>
        <Item title={t('color_scheme')}>
          <Select
            value={scheme}
            onChange={(e) => {
              setScheme(e.target.value as ColorScheme)
            }}
          >
            <option value="system">{t('color_scheme.system')}</option>
            <option value="light">{t('color_scheme.light')}</option>
            <option value="dark">{t('color_scheme.dark')}</option>
          </Select>
        </Item>
        <Item title={t('text_selection_menu')}>
          <Checkbox
            name={t('text_selection_menu.enable')}
            checked={settings.enableTextSelectionMenu}
            onChange={(e) => {
              setSettings({
                ...settings,
                enableTextSelectionMenu: e.target.checked,
              })
            }}
          />
        </Item>
        <Account />
        <Item title={t('cache')}>
          <Button
            variant="secondary"
            onClick={() => {
              window.localStorage.clear()
            }}
          >
            {t('cache.clear')}
          </Button>
        </Item>
      </div>
    </Page>
  )
}

const Account: React.FC = () => {
  const { user, loading } = useAuth()
  const t = useTranslation('settings.synchronization')

  if (loading) {
    return (
      <Item title={t('title')}>
        <span className="text-on-surface-variant">…</span>
      </Item>
    )
  }

  return (
    <Item title={t('title')}>
      {user ? (
        <div className="space-y-2">
          <p className="typescale-body-small text-on-surface-variant">
            {user.email ?? user.uid}
          </p>
          <Button variant="secondary" onClick={() => signOut()}>
            {t('unauthorize')}
          </Button>
        </div>
      ) : (
        <Button
          onClick={() => signInWithGoogle().catch(console.error)}
        >
          {t('authorize')}
        </Button>
      )}
    </Item>
  )
}

interface PartProps {
  title: string
}
const Item: React.FC<PartProps> = ({ title, children }) => {
  return (
    <div>
      <h3 className="typescale-title-small text-on-surface-variant">{title}</h3>
      <div className="mt-2">{children}</div>
    </div>
  )
}

Settings.displayName = 'settings'
