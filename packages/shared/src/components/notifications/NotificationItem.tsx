import React, { ReactElement, useMemo } from 'react';
import classNames from 'classnames';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Notification } from '../../graphql/notifications';
import { useObjectPurify } from '../../hooks/useDomPurify';
import NotificationItemIcon from './NotificationIcon';
import NotificationItemAttachment from './NotificationItemAttachment';
import NotificationItemAvatar from './NotificationItemAvatar';
import { NotificationType, notificationTypeTheme } from './utils';
import OptionsButton from '../buttons/OptionsButton';
import { KeyboardCommand } from '../../lib/element';
import { ProfilePicture } from '../ProfilePicture';
import { ProfilePictureGroup } from '../ProfilePictureGroup';

export interface NotificationItemProps
  extends Pick<
    Notification,
    | 'type'
    | 'icon'
    | 'title'
    | 'description'
    | 'avatars'
    | 'attachments'
    | 'numTotalAvatars'
  > {
  isUnread?: boolean;
  targetUrl: string;
  onClick?: (
    e:
      | React.MouseEvent<HTMLAnchorElement>
      | React.KeyboardEvent<HTMLAnchorElement>,
  ) => void;
  onOptionsClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

function NotificationItem({
  icon,
  type,
  title,
  isUnread,
  description,
  avatars,
  attachments,
  onClick,
  onOptionsClick,
  targetUrl,
  numTotalAvatars,
}: NotificationItemProps): ReactElement {
  const {
    isReady,
    title: memoizedTitle,
    description: memoizedDescription,
  } = useObjectPurify({ title, description });
  const router = useRouter();

  const filteredAvatars = useMemo(() => {
    return avatars?.filter((avatar) => avatar) || [];
  }, [avatars]);

  if (!isReady) {
    return null;
  }

  const avatarComponents =
    type === NotificationType.CollectionUpdated ? (
      <ProfilePictureGroup total={numTotalAvatars} size="medium">
        {filteredAvatars.map((avatar) => (
          <ProfilePicture
            key={avatar.referenceId}
            rounded="full"
            size="medium"
            user={{ image: avatar.image }}
          />
        ))}
      </ProfilePictureGroup>
    ) : (
      filteredAvatars
        .map((avatar) => (
          <NotificationItemAvatar
            key={avatar.referenceId}
            className="z-1"
            {...avatar}
          />
        ))
        .filter((avatar) => avatar) ?? []
    );
  const hasAvatar = filteredAvatars.length > 0;

  return (
    <div
      className={classNames(
        'relative group flex flex-row py-4 pl-6 pr-4 hover:bg-theme-hover focus:bg-theme-active border-y border-theme-bg-primary',
        isUnread && 'bg-theme-float',
      )}
    >
      {onClick && (
        <Link href={targetUrl} passHref>
          <a
            role="link"
            aria-label="Open notification"
            className="absolute inset-0 z-0"
            onClick={onClick}
            title="Open notification"
            data-testid="openNotification"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.code === KeyboardCommand.Space) {
                onClick(e);
                router.push(targetUrl);
              }
              return true;
            }}
          >
            <span />
          </a>
        </Link>
      )}
      {onOptionsClick && (
        <OptionsButton
          className="hidden group-hover:flex absolute top-3 right-2"
          type="button"
          onClick={onOptionsClick}
        />
      )}
      <NotificationItemIcon
        icon={icon}
        iconTheme={notificationTypeTheme[type]}
      />
      <div className="flex flex-col flex-1 ml-4 w-full text-left typo-callout">
        {hasAvatar && (
          <span className="flex flex-row gap-2 mb-4">{avatarComponents}</span>
        )}
        <span
          className="break-words"
          dangerouslySetInnerHTML={{
            __html: memoizedTitle,
          }}
        />
        {description && (
          <p
            className="mt-2 w-4/5 break-words text-theme-label-quaternary"
            dangerouslySetInnerHTML={{
              __html: memoizedDescription,
            }}
          />
        )}
        {attachments?.map(({ title: attachment, ...props }) => (
          <NotificationItemAttachment
            key={attachment}
            title={attachment}
            {...props}
          />
        ))}
      </div>
    </div>
  );
}

export default NotificationItem;
