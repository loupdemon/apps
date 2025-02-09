import { Checkbox } from '@dailydotdev/shared/src/components/fields/Checkbox';
import { Switch } from '@dailydotdev/shared/src/components/fields/Switch';
import React, {
  ReactElement,
  SetStateAction,
  useContext,
  useState,
} from 'react';
import { cloudinary } from '@dailydotdev/shared/src/lib/image';
import CloseButton from '@dailydotdev/shared/src/components/CloseButton';
import Pointer, {
  PointerColor,
} from '@dailydotdev/shared/src/components/alert/Pointer';
import useProfileForm from '@dailydotdev/shared/src/hooks/useProfileForm';
import AuthContext from '@dailydotdev/shared/src/contexts/AuthContext';
import { useAnalyticsContext } from '@dailydotdev/shared/src/contexts/AnalyticsContext';
import {
  AnalyticsEvent,
  NotificationCategory,
  NotificationChannel,
  NotificationPromptSource,
} from '@dailydotdev/shared/src/lib/analytics';
import { ButtonSize } from '@dailydotdev/shared/src/components/buttons/Button';
import { SendType, usePersonalizedDigest } from '@dailydotdev/shared/src/hooks';
import usePersistentContext from '@dailydotdev/shared/src/hooks/usePersistentContext';
import { usePushNotificationContext } from '@dailydotdev/shared/src/contexts/PushNotificationContext';
import { usePushNotificationMutation } from '@dailydotdev/shared/src/hooks/notifications';
import Link from 'next/link';
import { anchorDefaultRel } from '@dailydotdev/shared/src/lib/strings';
import { Radio } from '@dailydotdev/shared/src/components/fields/Radio';
import { HourDropdown } from '@dailydotdev/shared/src/components/fields/HourDropdown';
import { UserPersonalizedDigestType } from '@dailydotdev/shared/src/graphql/users';
import { isNullOrUndefined } from '@dailydotdev/shared/src/lib/func';
import { getAccountLayout } from '../../components/layouts/AccountLayout';
import { AccountPageContainer } from '../../components/layouts/AccountLayout/AccountPageContainer';
import AccountContentSection from '../../components/layouts/AccountLayout/AccountContentSection';

const ALERT_PUSH_KEY = 'alert_push_key';

const AccountNotificationsPage = (): ReactElement => {
  const { isSubscribed, isInitialized, isPushSupported } =
    usePushNotificationContext();
  const { onTogglePermission } = usePushNotificationMutation();
  const [isAlertShown, setIsAlertShown] = usePersistentContext<boolean>(
    ALERT_PUSH_KEY,
    true,
  );
  const { updateUserProfile } = useProfileForm();
  const { trackEvent } = useAnalyticsContext();
  const { user } = useContext(AuthContext);
  const {
    getPersonalizedDigest,
    isLoading,
    subscribePersonalizedDigest,
    unsubscribePersonalizedDigest,
  } = usePersonalizedDigest();
  const [digestTimeIndex, setDigestTimeIndex] = useState(8);
  const [readingTimeIndex, setReadingTimeIndex] = useState(8);

  const readingReminder = getPersonalizedDigest(
    UserPersonalizedDigestType.ReadingReminder,
  );
  const personalizedDigest = getPersonalizedDigest(
    UserPersonalizedDigestType.Digest,
  );

  if (
    !isNullOrUndefined(personalizedDigest) &&
    personalizedDigest?.preferredHour !== digestTimeIndex
  ) {
    setDigestTimeIndex(personalizedDigest?.preferredHour);
  }
  if (
    !isNullOrUndefined(readingReminder) &&
    readingReminder?.preferredHour !== readingTimeIndex
  ) {
    setReadingTimeIndex(readingReminder?.preferredHour);
  }
  const personalizedDigestType =
    personalizedDigest?.flags?.sendType || (!isLoading ? 'off' : null);

  const { acceptedMarketing, notificationEmail } = user ?? {};
  const emailNotification =
    acceptedMarketing || notificationEmail || !!personalizedDigest;

  const onToggleEmailSettings = () => {
    const value = !emailNotification;

    const defaultTrackingProps = {
      extra: JSON.stringify({
        channel: NotificationChannel.Email,
        category: [
          NotificationCategory.Product,
          NotificationCategory.Marketing,
          NotificationCategory.Digest,
        ],
      }),
    };

    if (value) {
      trackEvent({
        event_name: AnalyticsEvent.EnableNotification,
        ...defaultTrackingProps,
      });
    } else {
      trackEvent({
        event_name: AnalyticsEvent.DisableNotification,
        ...defaultTrackingProps,
      });
    }

    updateUserProfile({
      acceptedMarketing: value,
      notificationEmail: value,
    });

    if (value) {
      subscribePersonalizedDigest({ sendType: SendType.Weekly });
    } else {
      unsubscribePersonalizedDigest();
    }
  };

  const onTrackToggle = (
    isEnabled: boolean,
    channel: NotificationChannel,
    category: NotificationCategory,
  ) => {
    const baseTrackingProps = {
      extra: JSON.stringify({ channel, category }),
    };
    if (isEnabled) {
      trackEvent({
        event_name: AnalyticsEvent.EnableNotification,
        ...baseTrackingProps,
      });
    } else {
      trackEvent({
        event_name: AnalyticsEvent.DisableNotification,
        ...baseTrackingProps,
      });
    }
  };

  const onToggleReadingReminder = (forceValue?: boolean) => {
    const value = forceValue || !readingReminder;
    onTrackToggle(
      value,
      NotificationChannel.Web,
      NotificationCategory.ReadingReminder,
    );

    trackEvent({
      event_name: AnalyticsEvent.ScheduleReadingReminder,
      extra: JSON.stringify({
        hour: readingTimeIndex,
        timezone: user?.timezone,
      }),
    });
  };

  const onTogglePush = async () => {
    onTrackToggle(
      !isSubscribed,
      NotificationChannel.Web,
      NotificationCategory.Product,
    );

    onToggleReadingReminder(!isSubscribed);

    return onTogglePermission(NotificationPromptSource.NotificationsPage);
  };

  const onToggleEmailNotification = () => {
    const value = !notificationEmail;
    onTrackToggle(
      value,
      NotificationChannel.Email,
      NotificationCategory.Product,
    );
    updateUserProfile({ notificationEmail: value });
  };

  const onToggleEmailMarketing = () => {
    const value = !acceptedMarketing;
    onTrackToggle(
      value,
      NotificationChannel.Email,
      NotificationCategory.Marketing,
    );
    updateUserProfile({ acceptedMarketing: value });
  };

  const setPersonalizedDigestType = (sendType: SendType): void => {
    onTrackToggle(
      sendType !== SendType.Off,
      NotificationChannel.Email,
      NotificationCategory.Digest,
    );

    if (sendType === SendType.Off) {
      unsubscribePersonalizedDigest();
    } else {
      trackEvent({
        event_name: AnalyticsEvent.ScheduleDigest,
        extra: JSON.stringify({
          hour: digestTimeIndex,
          timezone: user?.timezone,
          frequency: sendType,
        }),
      });
      subscribePersonalizedDigest({ sendType });
    }
  };

  const setCustomTime = (
    type: UserPersonalizedDigestType,
    preferredHour: number,
    setHour: React.Dispatch<SetStateAction<number>>,
  ): void => {
    if (type === UserPersonalizedDigestType.ReadingReminder) {
      trackEvent({
        event_name: AnalyticsEvent.ScheduleReadingReminder,
        extra: JSON.stringify({
          hour: preferredHour,
          timezone: user?.timezone,
        }),
      });
    } else if (type === UserPersonalizedDigestType.Digest) {
      trackEvent({
        event_name: AnalyticsEvent.ScheduleDigest,
        extra: JSON.stringify({
          hour: preferredHour,
          timezone: user?.timezone,
          frequency: personalizedDigestType,
        }),
      });
    }

    subscribePersonalizedDigest({ type, hour: preferredHour });
    setHour(preferredHour);
  };

  const showAlert =
    isPushSupported && isAlertShown && isInitialized && !isSubscribed;

  return (
    <AccountPageContainer title="Notifications">
      <p className="mb-4 text-text-tertiary typo-footnote">
        Some notifications are based on your{' '}
        <Link href="/account/profile#yourtimezone">
          <a
            className="text-text-link hover:underline"
            target="_blank"
            rel={anchorDefaultRel}
          >
            timezone
          </a>
        </Link>
      </p>
      <div className="flex flex-row gap-4">
        <AccountContentSection
          className={{
            heading: 'mt-0',
            container: 'flex w-full flex-1 flex-col gap-4',
          }}
          title="Email notifications"
          description="Tailor your email notifications by selecting the types of emails that are important to you."
        />
        <Switch
          data-testid="email_notification-switch"
          inputId="email_notification-switch"
          name="email_notification"
          className="w-20 justify-end"
          compact={false}
          checked={emailNotification}
          onToggle={onToggleEmailSettings}
        >
          {emailNotification ? 'On' : 'Off'}
        </Switch>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-2">
        <Checkbox name="newsletter" checked disabled>
          System alerts (security, privacy, etc.)
        </Checkbox>
        <Checkbox
          name="new_activity"
          data-testid="new_activity-switch"
          checked={notificationEmail}
          onToggle={onToggleEmailNotification}
        >
          Activity (mentions, replies, upvotes, etc.)
        </Checkbox>
        <Checkbox
          name="marketing"
          data-testid="marketing-switch"
          checked={acceptedMarketing}
          onToggle={onToggleEmailMarketing}
        >
          Community updates
        </Checkbox>
        <div className="my-2 gap-1">
          <h3 className="font-bold typo-callout">Personalized digest</h3>
          <p className="text-text-tertiary typo-footnote">
            Stay informed with daily or weekly emails tailored to your
            interests.
          </p>
        </div>
        <Radio
          name="personalizedDigest"
          value={personalizedDigestType}
          options={[
            { label: 'Daily (Mon-Fri)', value: 'workdays' },
            { label: 'Weekly', value: 'weekly' },
            { label: 'Off', value: 'off' },
          ]}
          onChange={setPersonalizedDigestType}
        />
        {personalizedDigestType !== 'off' && (
          <>
            <div className="my-2">
              <h3 className="font-bold typo-callout">
                What&apos;s the ideal time to email you?
              </h3>
            </div>
            <HourDropdown
              className={{ container: 'w-40' }}
              hourIndex={digestTimeIndex}
              setHourIndex={(hour) =>
                setCustomTime(
                  UserPersonalizedDigestType.Digest,
                  hour,
                  setDigestTimeIndex,
                )
              }
            />
          </>
        )}
      </div>
      {isPushSupported && (
        <>
          <div className="my-4 border-t border-border-subtlest-tertiary" />
          <div className="flex flex-row">
            <AccountContentSection
              className={{
                heading: 'mt-0',
                container: 'flex w-full flex-1 flex-col',
              }}
              title="Push notifications"
              description="Receive notifications for mentions, replies, comments and more, keeping you connected with the community."
            />
            <Switch
              data-testid="push_notification-switch"
              inputId="push_notification-switch"
              name="push_notification"
              className="w-20 justify-end"
              compact={false}
              checked={isSubscribed}
              onToggle={onTogglePush}
              disabled={!isInitialized}
            >
              {isSubscribed ? 'On' : 'Off'}
            </Switch>
          </div>

          {showAlert && (
            <div className="relative mt-6 w-full rounded-16 border border-accent-cabbage-default">
              <Pointer
                className="absolute -top-5 right-8"
                color={PointerColor.Cabbage}
              />
              <div className="relative flex flex-row overflow-hidden p-4">
                <p className="flex-1 break-words typo-subhead">
                  Switch on push notifications so you never miss exciting
                  discussions, upvotes, replies or mentions on daily.dev!
                </p>
                <img
                  className="absolute right-14 top-4 hidden laptopL:flex"
                  src={cloudinary.notifications.browser}
                  alt="A sample browser notification"
                />
                <CloseButton
                  size={ButtonSize.XSmall}
                  className="ml-auto laptopL:ml-32"
                  onClick={() => setIsAlertShown(false)}
                />
              </div>
            </div>
          )}
          <div className="mt-6 grid grid-cols-1 gap-2">
            <Checkbox name="newsletter" checked disabled>
              Activity (mentions, replies, upvotes, etc.)
            </Checkbox>
            <Checkbox
              name="readingReminder"
              data-testid="reading-reminder-switch"
              checked={!!readingReminder}
              onToggle={onToggleReadingReminder}
            >
              Reading reminder (Mon-Fri)
            </Checkbox>
            {!!readingReminder && (
              <>
                <div className="my-2">
                  <h3 className="font-bold typo-callout">
                    What&apos;s the ideal time to send you a reading reminder?
                  </h3>
                  <p className="text-text-tertiary typo-footnote">
                    Developers who receive daily reading reminders are more
                    likely to stay ahead of the curve.
                  </p>
                </div>
                <HourDropdown
                  hourIndex={readingTimeIndex}
                  setHourIndex={(hour) =>
                    setCustomTime(
                      UserPersonalizedDigestType.ReadingReminder,
                      hour,
                      setReadingTimeIndex,
                    )
                  }
                  className={{
                    container: 'w-40',
                    menu: '-translate-y-[19rem]',
                  }}
                />
              </>
            )}
          </div>
        </>
      )}
    </AccountPageContainer>
  );
};

AccountNotificationsPage.getLayout = getAccountLayout;

export default AccountNotificationsPage;
