// Self-check for the DM normalizer. Run: node test/normalizer.test.mjs
import assert from 'node:assert/strict';
import { normalize } from '../src/normalizer.js';
import { validate } from '../src/schema.js';

const sender = (fbid, full_name) => ({ sender_fbid: fbid, sender: { name: full_name, user_dict: { full_name } } });
const me = sender('1', 'Me Myself');
const them = sender('2', 'Other Person');
const node = (ts, who, content_type, content, extra = {}) => ({
  message_id: `mid.${ts}`,
  timestamp_ms: String(ts),
  content_type,
  content,
  ...who,
  ...extra,
});

const call = (ts, who, plaintext) =>
  node(ts, who, 'IG_VIDEO_CALL_XMAT', { __typename: 'SlideMessageAdminText', text_fragments: [{ plaintext }] });

const info = {
  thread_id: '999',
  thread_title: null,
  users: [{ fbid: '2', username: 'other', full_name: 'Other Person' }],
  viewer_fbid: '1',
};

const out = normalize(info, [
  node(1000, me, 'TEXT', { __typename: 'SlideMessageText', text_body: 'hi' }, {
    text_body: 'hi',
    reactions: [{ reaction: '❤', sender_fbid: '2' }],
  }),
  node(2000, them, 'IMAGES', {
    __typename: 'SlideMessageImageContent',
    attachments: [{ attachment_cdn_url: 'https://cdn/a.jpg' }, { preview_cdn_url: 'https://cdn/b.jpg' }],
  }),
  node(3000, them, 'AUDIOS', {
    __typename: 'SlideMessageAudiosContent',
    audio_attachments: [{ attachment_cdn_url: 'https://cdn/a.mp4' }],
  }),
  node(4000, me, 'MESSAGE_INLINE_SHARE', {
    __typename: 'SlideMessageXMAContent',
    xma: { target_url: 'https://www.instagram.com/reel/abc/', header_title_text: 'owner', preview_image: { url: 'https://cdn/reel.jpg' } },
  }),
  // Answered call: started + ended fold into one message, 60s apart.
  call(5000, them, 'Other started an audio call'),
  call(65000, them, 'Audio call ended'),
  // Missed call: duration 0.
  call(70000, them, 'Other started a video chat'),
  call(90000, them, 'You missed a video chat'),
  // An end notice whose start wasn't loaded stays a plain text row.
  call(100000, them, 'Audio call ended'),
  node(6000, them, 'REACTION_LOG_XMAT', {
    __typename: 'SlideMessageAdminText',
    text_fragments: [{ plaintext: 'Liked a message' }],
  }),
  node(7000, me, 'MULTI', {
    __typename: 'SlideMessageMultiMediaContent',
    ordered_photo_video_attachments: [
      { attachment_cdn_url: 'https://cdn/v.mp4?x=1' },
      { attachment_cdn_url: 'https://cdn/p.jpg' },
    ],
  }),
  node(8000, me, 'TEXT', { __typename: 'SlideMessageText', text_body: '   ' }), // empty → dropped
  node(9000, them, 'MESSAGE_INLINE_SHARE', {
    __typename: 'SlideMessageXMAContent',
    xma: { __typename: 'SlideMessagePlaceholderXMA', title_text: 'Message unavailable' },
  }), // placeholder → dropped
  node(9500, them, 'MONTAGE_SHARE_XMA', {
    __typename: 'SlideMessageXMAContent',
    xma: { __typename: 'SlideMessageExpiredPlaceholderXMA', eyebrow_text: 'Mentioned you in their story', caption_body_text: 'Story unavailable' },
  }), // expired story mention → kept, as Instagram shows it
  node(9600, them, 'MESSAGE_INLINE_SHARE', {
    __typename: 'SlideMessageXMAContent',
    xma: { __typename: 'SlideMessageStandardXMA', target_url: 'https://www.instagram.com/someone', header_title_text: 'someone', header_subtitle_text: 'Some One', verified_type: 'DEFAULT', header_icon: { url: 'https://cdn/av.jpg' } },
  }), // shared profile
  node(9700, them, 'MESSAGE_INLINE_SHARE', {
    __typename: 'SlideMessageXMAContent',
    xma: { __typename: 'SlideMessagePortraitXMA', target_url: 'https://www.instagram.com/reel/r/', header_title_text: 'o', verified_type: 'NOT_VERIFIED', preview_image: { url: 'https://cdn/r.jpg', preview_image_decoration_type: 'REEL' } },
  }), // shared reel
]);

assert.deepEqual(validate(out), []);
assert.deepEqual(out.participants, [{ name: 'Other Person' }, { name: 'Me Myself' }]);
assert.equal(out.title, 'Other Person');
assert.equal(out.thread_path, 'inbox/other_person_999');

// Newest first; the reaction log, the blank text and the placeholder are gone.
assert.deepEqual(out.messages.map((m) => m.timestamp_ms), [100000, 70000, 9700, 9600, 9500, 7000, 5000, 4000, 3000, 2000, 1000]);
const at = (ts) => out.messages.find((m) => m.timestamp_ms === ts);

assert.equal(at(1000).content, 'hi');
assert.equal(at(1000).sender_name, 'Me Myself');
assert.deepEqual(at(1000).reactions, [{ reaction: '❤', actor: 'Other Person' }]);
assert.deepEqual(at(2000).photos.map((p) => p.uri), ['https://cdn/a.jpg', 'https://cdn/b.jpg']);
assert.equal(at(2000).photos[0].creation_timestamp, 2);
assert.equal(at(3000).audio_files[0].uri, 'https://cdn/a.mp4');
assert.deepEqual(at(4000).share, {
  link: 'https://www.instagram.com/reel/abc/',
  share_text: '',
  original_content_owner: 'owner',
  preview: { uri: 'https://cdn/reel.jpg' },
  kind: 'post',
});
assert.deepEqual(at(9500).share, { link: '', share_text: 'Story unavailable', original_content_owner: '', eyebrow: 'Mentioned you in their story', kind: 'quote' });
assert.deepEqual(at(9600).share, { link: 'https://www.instagram.com/someone', share_text: '', original_content_owner: 'someone', owner_subtitle: 'Some One', owner_verified: true, owner_icon: { uri: 'https://cdn/av.jpg' }, kind: 'profile' });
assert.equal(at(9700).share.kind, 'portrait');
assert.equal(at(5000).content, 'Other started an audio call');
assert.equal(at(5000).call_duration, 60);
assert.equal(at(70000).call_duration, 0);
assert.equal(at(100000).content, 'Audio call ended');
assert.equal('call_duration' in at(100000), false);
assert.equal('call_duration' in at(1000), false);
assert.equal(at(7000).videos[0].uri, 'https://cdn/v.mp4?x=1');
assert.equal(at(7000).photos[0].uri, 'https://cdn/p.jpg');

console.log('normalizer ok');
