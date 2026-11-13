/* ==========================================================================
   Tele — FireChats, Encrypted Groups, FireCasts, Camera, Voice, Media & Files
   ========================================================================== */

const REACTIONS = ['🔥', '❤️', '👍', '😂', '🎉', '👀'];

const EMOJI_CATEGORY_TABS = [
  { id: 'all', icon: '⭐', label: 'All Emojis' },
  { id: 'smileys', icon: '😀', label: 'Smileys & Emotion' },
  { id: 'gestures', icon: '👍', label: 'Gestures & People' },
  { id: 'hearts', icon: '❤️', label: 'Hearts & Symbols' },
  { id: 'animals', icon: '🐶', label: 'Animals & Nature' },
  { id: 'food', icon: '🍕', label: 'Food & Drinks' },
  { id: 'activities', icon: '🎉', label: 'Activities & Fun' },
  { id: 'objects', icon: '🚀', label: 'Travel & Objects' }
];

const FULL_EMOJIS_LIST = [
  // Smileys & Emotion
  { emoji: '😀', name: 'Grinning Face', category: 'smileys', tags: ['smile', 'happy', 'grin'] },
  { emoji: '😃', name: 'Grinning Face with Big Eyes', category: 'smileys', tags: ['smile', 'happy', 'joy'] },
  { emoji: '😄', name: 'Grinning Face with Smiling Eyes', category: 'smileys', tags: ['smile', 'happy', 'laugh'] },
  { emoji: '😁', name: 'Beaming Face', category: 'smileys', tags: ['grin', 'teeth', 'happy'] },
  { emoji: '😆', name: 'Grinning Squinting Face', category: 'smileys', tags: ['laugh', 'happy', 'haha'] },
  { emoji: '😅', name: 'Grinning Face with Sweat', category: 'smileys', tags: ['sweat', 'relief', 'nervous'] },
  { emoji: '😂', name: 'Face with Tears of Joy', category: 'smileys', tags: ['joy', 'laugh', 'crying', 'lol'] },
  { emoji: '🤣', name: 'Rolling on Floor Laughing', category: 'smileys', tags: ['rofl', 'laugh', 'lol'] },
  { emoji: '🥲', name: 'Smiling Face with Tear', category: 'smileys', tags: ['tear', 'happy', 'sad', 'bittersweet'] },
  { emoji: '🥹', name: 'Holding Back Tears', category: 'smileys', tags: ['tears', 'proud', 'emotional', 'plead'] },
  { emoji: '☺️', name: 'Smiling Face', category: 'smileys', tags: ['smile', 'peace', 'warm'] },
  { emoji: '😊', name: 'Smiling Face with Smiling Eyes', category: 'smileys', tags: ['blush', 'proud', 'happy'] },
  { emoji: '😇', name: 'Smiling Face with Halo', category: 'smileys', tags: ['angel', 'innocent', 'good'] },
  { emoji: '🙂', name: 'Slightly Smiling Face', category: 'smileys', tags: ['smile', 'okay'] },
  { emoji: '🙃', name: 'Upside-Down Face', category: 'smileys', tags: ['silly', 'sarcasm', 'irony'] },
  { emoji: '😉', name: 'Winking Face', category: 'smileys', tags: ['wink', 'flirt', 'joke'] },
  { emoji: '😌', name: 'Relieved Face', category: 'smileys', tags: ['relief', 'calm', 'peace'] },
  { emoji: '😍', name: 'Heart Eyes', category: 'smileys', tags: ['love', 'crush', 'heart'] },
  { emoji: '🥰', name: 'Smiling Face with Hearts', category: 'smileys', tags: ['love', 'adore', 'warm'] },
  { emoji: '😘', name: 'Blow a Kiss', category: 'smileys', tags: ['kiss', 'flirt', 'love'] },
  { emoji: '😋', name: 'Face Savoring Food', category: 'smileys', tags: ['yum', 'delicious', 'tasty'] },
  { emoji: '😛', name: 'Face with Tongue', category: 'smileys', tags: ['tongue', 'playful', 'silly'] },
  { emoji: '😜', name: 'Winking Face with Tongue', category: 'smileys', tags: ['crazy', 'joke', 'party'] },
  { emoji: '🤪', name: 'Zany Face', category: 'smileys', tags: ['wild', 'crazy', 'goofy'] },
  { emoji: '😝', name: 'Squinting Face with Tongue', category: 'smileys', tags: ['prank', 'lol', 'tongue'] },
  { emoji: '🤑', name: 'Money Mouth', category: 'smileys', tags: ['money', 'rich', 'cash'] },
  { emoji: '🤗', name: 'Smiling Face with Open Hands', category: 'smileys', tags: ['hug', 'warm', 'welcome'] },
  { emoji: '🤭', name: 'Face with Hand Over Mouth', category: 'smileys', tags: ['oops', 'giggle', 'secret'] },
  { emoji: '🤫', name: 'Shushing Face', category: 'smileys', tags: ['quiet', 'shh', 'secret'] },
  { emoji: '🤔', name: 'Thinking Face', category: 'smileys', tags: ['think', 'hmm', 'curious', 'wonder'] },
  { emoji: '🫡', name: 'Saluting Face', category: 'smileys', tags: ['salute', 'respect', 'yes sir'] },
  { emoji: '🤐', name: 'Zipper-Mouth Face', category: 'smileys', tags: ['zip', 'silent', 'secret'] },
  { emoji: '🤨', name: 'Face with Raised Eyebrow', category: 'smileys', tags: ['suspicious', 'doubt', 'skeptical'] },
  { emoji: '😐', name: 'Neutral Face', category: 'smileys', tags: ['neutral', 'blank', 'meh'] },
  { emoji: '😑', name: 'Expressionless Face', category: 'smileys', tags: ['expressionless', 'unimpressed'] },
  { emoji: '😶', name: 'Face Without Mouth', category: 'smileys', tags: ['speechless', 'mute'] },
  { emoji: '🫥', name: 'Dotted Line Face', category: 'smileys', tags: ['invisible', 'disappear', 'introvert'] },
  { emoji: '😏', name: 'Smirking Face', category: 'smileys', tags: ['smirk', 'flirt', 'sly'] },
  { emoji: '😒', name: 'Unamused Face', category: 'smileys', tags: ['unamused', 'annoyed', 'meh'] },
  { emoji: '🙄', name: 'Face with Rolling Eyes', category: 'smileys', tags: ['eye roll', 'sarcasm', 'bored'] },
  { emoji: '😬', name: 'Grimacing Face', category: 'smileys', tags: ['grimace', 'awkward', 'nervous'] },
  { emoji: '🤥', name: 'Lying Face', category: 'smileys', tags: ['lie', 'pinocchio', 'fake'] },
  { emoji: '😌', name: 'Relieved Face', category: 'smileys', tags: ['calm', 'peace'] },
  { emoji: '😔', name: 'Pensive Face', category: 'smileys', tags: ['sad', 'pensive', 'sorry'] },
  { emoji: '😪', name: 'Sleepy Face', category: 'smileys', tags: ['tired', 'sleepy', 'drool'] },
  { emoji: '🤤', name: 'Drooling Face', category: 'smileys', tags: ['drool', 'craving', 'hungry'] },
  { emoji: '😴', name: 'Sleeping Face', category: 'smileys', tags: ['sleep', 'zzz', 'night'] },
  { emoji: '😷', name: 'Face with Medical Mask', category: 'smileys', tags: ['mask', 'sick', 'covid'] },
  { emoji: '🤒', name: 'Face with Thermometer', category: 'smileys', tags: ['sick', 'fever', 'ill'] },
  { emoji: '🤕', name: 'Face with Head-Bandage', category: 'smileys', tags: ['hurt', 'bandage', 'injured'] },
  { emoji: '🤢', name: 'Nauseated Face', category: 'smileys', tags: ['sick', 'gross', 'nausea'] },
  { emoji: '🤮', name: 'Face Vomiting', category: 'smileys', tags: ['puke', 'gross', 'vomit'] },
  { emoji: '🤧', name: 'Sneezing Face', category: 'smileys', tags: ['sneeze', 'tissue', 'cold'] },
  { emoji: '🥵', name: 'Hot Face', category: 'smileys', tags: ['hot', 'heat', 'summer', 'sweat'] },
  { emoji: '🥶', name: 'Cold Face', category: 'smileys', tags: ['cold', 'freezing', 'ice', 'winter'] },
  { emoji: '🥴', name: 'Woozy Face', category: 'smileys', tags: ['woozy', 'drunk', 'dizzy'] },
  { emoji: '😵', name: 'Face with Crossed-Out Eyes', category: 'smileys', tags: ['dizzy', 'dead', 'ko'] },
  { emoji: '🤯', name: 'Exploding Head', category: 'smileys', tags: ['mind blown', 'shock', 'boom'] },
  { emoji: '🤠', name: 'Cowboy Hat Face', category: 'smileys', tags: ['cowboy', 'yeehaw', 'western'] },
  { emoji: '🥳', name: 'Partying Face', category: 'smileys', tags: ['party', 'celebrate', 'bday', 'yay'] },
  { emoji: '🥸', name: 'Disguised Face', category: 'smileys', tags: ['disguise', 'glasses', 'incognito'] },
  { emoji: '😎', name: 'Sunglasses Face', category: 'smileys', tags: ['cool', 'boss', 'shades', 'chill'] },
  { emoji: '🤓', name: 'Nerd Face', category: 'smileys', tags: ['nerd', 'geek', 'glasses', 'smart'] },
  { emoji: '🧐', name: 'Face with Monocle', category: 'smileys', tags: ['classy', 'smart', 'analyze', 'hmm'] },
  { emoji: '😕', name: 'Confused Face', category: 'smileys', tags: ['confused', 'puzzled', 'what'] },
  { emoji: '😟', name: 'Worried Face', category: 'smileys', tags: ['worried', 'nervous', 'scared'] },
  { emoji: '🙁', name: 'Slightly Frowning Face', category: 'smileys', tags: ['sad', 'frown'] },
  { emoji: '😮', name: 'Face with Open Mouth', category: 'smileys', tags: ['wow', 'surprise', 'omg'] },
  { emoji: '😯', name: 'Hushed Face', category: 'smileys', tags: ['shocked', 'quiet', 'surprised'] },
  { emoji: '😲', name: 'Astonished Face', category: 'smileys', tags: ['astonished', 'gasp', 'shock'] },
  { emoji: '😳', name: 'Flushed Face', category: 'smileys', tags: ['flushed', 'blush', 'embarrassed'] },
  { emoji: '🥺', name: 'Pleading Face', category: 'smileys', tags: ['plead', 'puppy eyes', 'beg'] },
  { emoji: '😦', name: 'Frowning Face with Open Mouth', category: 'smileys', tags: ['shock', 'aww'] },
  { emoji: '😨', name: 'Fearful Face', category: 'smileys', tags: ['fear', 'scared', 'dread'] },
  { emoji: '😰', name: 'Anxious Face with Sweat', category: 'smileys', tags: ['sweat', 'anxious', 'nervous'] },
  { emoji: '😥', name: 'Sad but Relieved Face', category: 'smileys', tags: ['phew', 'relief', 'almost'] },
  { emoji: '😢', name: 'Crying Face', category: 'smileys', tags: ['cry', 'tear', 'sad'] },
  { emoji: '😭', name: 'Loudly Crying Face', category: 'smileys', tags: ['bawling', 'sob', 'crying', 'tears'] },
  { emoji: '😱', name: 'Face Screaming in Fear', category: 'smileys', tags: ['scream', 'scared', 'munch'] },
  { emoji: '😖', name: 'Confounded Face', category: 'smileys', tags: ['struggle', 'frustrated'] },
  { emoji: '😣', name: 'Persevering Face', category: 'smileys', tags: ['perseverance', 'struggle'] },
  { emoji: '😞', name: 'Disappointed Face', category: 'smileys', tags: ['disappointed', 'down'] },
  { emoji: '😓', name: 'Downcast Face with Sweat', category: 'smileys', tags: ['hard work', 'exhausted'] },
  { emoji: '😩', name: 'Weary Face', category: 'smileys', tags: ['weary', 'tired', 'ugh'] },
  { emoji: '😫', name: 'Tired Face', category: 'smileys', tags: ['tired', 'done', 'fed up'] },
  { emoji: '🥱', name: 'Yawning Face', category: 'smileys', tags: ['yawn', 'sleepy', 'bored'] },
  { emoji: '😤', name: 'Face with Steam from Nose', category: 'smileys', tags: ['proud', 'triumph', 'huff'] },
  { emoji: '😡', name: 'Enraged Face', category: 'smileys', tags: ['angry', 'mad', 'rage'] },
  { emoji: '😠', name: 'Angry Face', category: 'smileys', tags: ['mad', 'grumpy'] },
  { emoji: '🤬', name: 'Face with Symbols on Mouth', category: 'smileys', tags: ['swear', 'curse', 'furious'] },
  { emoji: '😈', name: 'Smiling Face with Horns', category: 'smileys', tags: ['devil', 'mischief', 'evil'] },
  { emoji: '👿', name: 'Angry Face with Horns', category: 'smileys', tags: ['demon', 'furious'] },
  { emoji: '💀', name: 'Skull', category: 'smileys', tags: ['dead', 'dying', 'skull', 'funny'] },
  { emoji: '☠️', name: 'Skull and Crossbones', category: 'smileys', tags: ['danger', 'poison', 'dead'] },
  { emoji: '💩', name: 'Pile of Poo', category: 'smileys', tags: ['poo', 'poop', 'funny'] },
  { emoji: '🤡', name: 'Clown Face', category: 'smileys', tags: ['clown', 'joke', 'fool'] },
  { emoji: '👻', name: 'Ghost', category: 'smileys', tags: ['ghost', 'boo', 'halloween'] },
  { emoji: '👽', name: 'Alien', category: 'smileys', tags: ['ufo', 'space', 'extraterrestrial'] },
  { emoji: '🤖', name: 'Robot', category: 'smileys', tags: ['bot', 'ai', 'machine'] },

  // Gestures & People
  { emoji: '👋', name: 'Waving Hand', category: 'gestures', tags: ['wave', 'hello', 'bye', 'hi'] },
  { emoji: '🤚', name: 'Raised Back of Hand', category: 'gestures', tags: ['stop', 'high five'] },
  { emoji: '🖐️', name: 'Hand with Fingers Splayed', category: 'gestures', tags: ['five', 'hand'] },
  { emoji: '✋', name: 'Raised Hand', category: 'gestures', tags: ['stop', 'high five', 'halt'] },
  { emoji: '🖖', name: 'Vulcan Salute', category: 'gestures', tags: ['spock', 'star trek', 'peace'] },
  { emoji: '👌', name: 'OK Hand', category: 'gestures', tags: ['ok', 'perfect', 'fine'] },
  { emoji: '🤌', name: 'Pinched Fingers', category: 'gestures', tags: ['italian', 'chef', 'what do you want'] },
  { emoji: '🤏', name: 'Pinching Hand', category: 'gestures', tags: ['little', 'small', 'tiny'] },
  { emoji: '✌️', name: 'Victory Hand', category: 'gestures', tags: ['peace', 'victory', 'two'] },
  { emoji: '🤞', name: 'Crossed Fingers', category: 'gestures', tags: ['luck', 'hope', 'promise'] },
  { emoji: '🫰', name: 'Hand with Index and Thumb Crossed', category: 'gestures', tags: ['kpop', 'heart', 'money'] },
  { emoji: '🤟', name: 'Love-You Gesture', category: 'gestures', tags: ['love', 'rock on', 'sign'] },
  { emoji: '🤘', name: 'Sign of the Horns', category: 'gestures', tags: ['metal', 'rock', 'horns'] },
  { emoji: '🤙', name: 'Call Me Hand', category: 'gestures', tags: ['call', 'shaka', 'hang loose'] },
  { emoji: '👈', name: 'Backhand Index Pointing Left', category: 'gestures', tags: ['point', 'left'] },
  { emoji: '👉', name: 'Backhand Index Pointing Right', category: 'gestures', tags: ['point', 'right'] },
  { emoji: '👆', name: 'Backhand Index Pointing Up', category: 'gestures', tags: ['up', 'point', 'this'] },
  { emoji: '👇', name: 'Backhand Index Pointing Down', category: 'gestures', tags: ['down', 'point'] },
  { emoji: '☝️', name: 'Index Pointing Up', category: 'gestures', tags: ['one', 'first', 'attention'] },
  { emoji: '👍', name: 'Thumbs Up', category: 'gestures', tags: ['yes', 'approve', 'good', 'agree', 'like'] },
  { emoji: '👎', name: 'Thumbs Down', category: 'gestures', tags: ['no', 'disapprove', 'bad', 'dislike'] },
  { emoji: '✊', name: 'Raised Fist', category: 'gestures', tags: ['power', 'strength', 'fist'] },
  { emoji: '👊', name: 'Oncoming Fist', category: 'gestures', tags: ['bro fist', 'punch'] },
  { emoji: '🤛', name: 'Left-Facing Fist', category: 'gestures', tags: ['bump', 'fist'] },
  { emoji: '🤜', name: 'Right-Facing Fist', category: 'gestures', tags: ['bump', 'fist'] },
  { emoji: '👏', name: 'Clapping Hands', category: 'gestures', tags: ['applause', 'bravo', 'congrats'] },
  { emoji: '🙌', name: 'Raising Hands', category: 'gestures', tags: ['celebrate', 'yay', 'praise', 'hooray'] },
  { emoji: '👐', name: 'Open Hands', category: 'gestures', tags: ['open', 'hug'] },
  { emoji: '🤲', name: 'Palms Up Together', category: 'gestures', tags: ['prayer', 'dua', 'hope'] },
  { emoji: '🤝', name: 'Handshake', category: 'gestures', tags: ['deal', 'agree', 'partner'] },
  { emoji: '🙏', name: 'Folded Hands', category: 'gestures', tags: ['please', 'thank you', 'pray', 'namaste'] },
  { emoji: '✍️', name: 'Writing Hand', category: 'gestures', tags: ['write', 'note', 'homework'] },
  { emoji: '💅', name: 'Nail Polish', category: 'gestures', tags: ['beauty', 'slay', 'sassy'] },
  { emoji: '🤳', name: 'Selfie', category: 'gestures', tags: ['selfie', 'camera', 'phone'] },
  { emoji: '💪', name: 'Flexed Biceps', category: 'gestures', tags: ['strong', 'gym', 'workout', 'power'] },
  { emoji: '👀', name: 'Eyes', category: 'gestures', tags: ['look', 'peek', 'watch', 'curious', 'see'] },
  { emoji: '👁️', name: 'Eye', category: 'gestures', tags: ['look', 'vision', 'view'] },
  { emoji: '🧠', name: 'Brain', category: 'gestures', tags: ['smart', 'intellect', 'think'] },
  { emoji: '🫀', name: 'Anatomical Heart', category: 'gestures', tags: ['heart', 'cardio', 'organ'] },
  { emoji: '🫁', name: 'Lungs', category: 'gestures', tags: ['breath', 'lungs', 'air'] },
  { emoji: '🗣️', name: 'Speaking Head', category: 'gestures', tags: ['talk', 'voice', 'sing'] },
  { emoji: '👤', name: 'Bust in Silhouette', category: 'gestures', tags: ['user', 'profile', 'contact'] },
  { emoji: '👥', name: 'Busts in Silhouette', category: 'gestures', tags: ['group', 'users', 'team'] },
  { emoji: '🫂', name: 'People Hugging', category: 'gestures', tags: ['hug', 'care', 'support'] },

  // Hearts & Symbols
  { emoji: '❤️', name: 'Red Heart', category: 'hearts', tags: ['love', 'heart', 'romance'] },
  { emoji: '🧡', name: 'Orange Heart', category: 'hearts', tags: ['love', 'orange'] },
  { emoji: '💛', name: 'Yellow Heart', category: 'hearts', tags: ['friendship', 'yellow', 'love'] },
  { emoji: '💚', name: 'Green Heart', category: 'hearts', tags: ['nature', 'green', 'love'] },
  { emoji: '💙', name: 'Blue Heart', category: 'hearts', tags: ['loyalty', 'blue', 'love'] },
  { emoji: '💜', name: 'Purple Heart', category: 'hearts', tags: ['purple', 'love', 'noble'] },
  { emoji: '🖤', name: 'Black Heart', category: 'hearts', tags: ['dark', 'goth', 'black'] },
  { emoji: '🤍', name: 'White Heart', category: 'hearts', tags: ['pure', 'white', 'love'] },
  { emoji: '🤎', name: 'Brown Heart', category: 'hearts', tags: ['brown', 'earth'] },
  { emoji: '💔', name: 'Broken Heart', category: 'hearts', tags: ['heartbreak', 'sad', 'breakup'] },
  { emoji: '❤️‍🔥', name: 'Heart on Fire', category: 'hearts', tags: ['passion', 'lust', 'fire', 'hot'] },
  { emoji: '❤️‍🩹', name: 'Mending Heart', category: 'hearts', tags: ['healing', 'better', 'recover'] },
  { emoji: '❣️', name: 'Heart Exclamation', category: 'hearts', tags: ['love', 'accent', 'exclamation'] },
  { emoji: '💕', name: 'Two Hearts', category: 'hearts', tags: ['love', 'affection'] },
  { emoji: '💞', name: 'Revolving Hearts', category: 'hearts', tags: ['love', 'sweet'] },
  { emoji: '💓', name: 'Beating Heart', category: 'hearts', tags: ['heartbeat', 'alive'] },
  { emoji: '💗', name: 'Growing Heart', category: 'hearts', tags: ['love', 'bloom'] },
  { emoji: '💖', name: 'Sparkling Heart', category: 'hearts', tags: ['sparkle', 'magic', 'shine'] },
  { emoji: '💘', name: 'Heart with Arrow', category: 'hearts', tags: ['cupid', 'love', 'shot'] },
  { emoji: '💝', name: 'Heart with Ribbon', category: 'hearts', tags: ['gift', 'present', 'sweet'] },
  { emoji: '✨', name: 'Sparkles', category: 'hearts', tags: ['magic', 'shine', 'clean', 'new', 'glow'] },
  { emoji: '🔥', name: 'Fire', category: 'hearts', tags: ['lit', 'hot', 'fire', 'burn', 'awesome'] },
  { emoji: '💥', name: 'Collision', category: 'hearts', tags: ['boom', 'explode', 'blast'] },
  { emoji: '⚡', name: 'High Voltage', category: 'hearts', tags: ['zap', 'lightning', 'energy', 'power', 'fast'] },
  { emoji: '💯', name: 'Hundred Points', category: 'hearts', tags: ['100', 'perfect', 'score', 'real'] },
  { emoji: '⭐', name: 'Star', category: 'hearts', tags: ['star', 'favorite', 'best'] },
  { emoji: '🌟', name: 'Glowing Star', category: 'hearts', tags: ['shine', 'superstar'] },
  { emoji: '💫', name: 'Dizzy', category: 'hearts', tags: ['sparkle', 'magic', 'orbit'] },
  { emoji: '✔️', name: 'Check Mark', category: 'hearts', tags: ['done', 'yes', 'verified'] },
  { emoji: '✅', name: 'Check Box', category: 'hearts', tags: ['confirmed', 'complete', 'ok'] },
  { emoji: '❌', name: 'Cross Mark', category: 'hearts', tags: ['no', 'wrong', 'cancel'] },
  { emoji: '⚠️', name: 'Warning', category: 'hearts', tags: ['alert', 'caution', 'warning'] },
  { emoji: '🛑', name: 'Stop Sign', category: 'hearts', tags: ['stop', 'halt', 'red'] },

  // Animals & Nature
  { emoji: '🐶', name: 'Dog Face', category: 'animals', tags: ['dog', 'puppy', 'pet'] },
  { emoji: '🐱', name: 'Cat Face', category: 'animals', tags: ['cat', 'kitten', 'meow'] },
  { emoji: '🐭', name: 'Mouse Face', category: 'animals', tags: ['mouse', 'rodent'] },
  { emoji: '🐹', name: 'Hamster', category: 'animals', tags: ['hamster', 'cute'] },
  { emoji: '🐰', name: 'Rabbit Face', category: 'animals', tags: ['bunny', 'rabbit'] },
  { emoji: '🦊', name: 'Fox', category: 'animals', tags: ['fox', 'clever'] },
  { emoji: '🐻', name: 'Bear', category: 'animals', tags: ['bear', 'grizzly'] },
  { emoji: '🐼', name: 'Panda', category: 'animals', tags: ['panda', 'cute'] },
  { emoji: '🐨', name: 'Koala', category: 'animals', tags: ['koala', 'australia'] },
  { emoji: '🐯', name: 'Tiger Face', category: 'animals', tags: ['tiger', 'wild', 'cat'] },
  { emoji: '🦁', name: 'Lion', category: 'animals', tags: ['lion', 'king', 'brave'] },
  { emoji: '🐮', name: 'Cow Face', category: 'animals', tags: ['cow', 'moo'] },
  { emoji: '🐷', name: 'Pig Face', category: 'animals', tags: ['pig', 'oink'] },
  { emoji: '🐸', name: 'Frog', category: 'animals', tags: ['frog', 'toad'] },
  { emoji: '🐵', name: 'Monkey Face', category: 'animals', tags: ['monkey', 'banana'] },
  { emoji: '🙈', name: 'See-No-Evil Monkey', category: 'animals', tags: ['monkey', 'shy', 'hide'] },
  { emoji: '🙉', name: 'Hear-No-Evil Monkey', category: 'animals', tags: ['monkey', 'loud'] },
  { emoji: '🙊', name: 'Speak-No-Evil Monkey', category: 'animals', tags: ['monkey', 'oops'] },
  { emoji: '🐔', name: 'Chicken', category: 'animals', tags: ['chicken', 'bird'] },
  { emoji: '🐧', name: 'Penguin', category: 'animals', tags: ['penguin', 'ice'] },
  { emoji: '🐦', name: 'Bird', category: 'animals', tags: ['bird', 'tweet'] },
  { emoji: '🦅', name: 'Eagle', category: 'animals', tags: ['eagle', 'freedom', 'bird'] },
  { emoji: '🦉', name: 'Owl', category: 'animals', tags: ['owl', 'wise', 'night'] },
  { emoji: '🐺', name: 'Wolf', category: 'animals', tags: ['wolf', 'howl'] },
  { emoji: '🦄', name: 'Unicorn', category: 'animals', tags: ['unicorn', 'magic', 'rainbow'] },
  { emoji: '🐝', name: 'Honeybee', category: 'animals', tags: ['bee', 'honey', 'buzz'] },
  { emoji: '🦋', name: 'Butterfly', category: 'animals', tags: ['butterfly', 'pretty', 'wings'] },
  { emoji: '🐢', name: 'Turtle', category: 'animals', tags: ['turtle', 'slow'] },
  { emoji: '🐍', name: 'Snake', category: 'animals', tags: ['snake', 'python'] },
  { emoji: '🐙', name: 'Octopus', category: 'animals', tags: ['octopus', 'sea'] },
  { emoji: '🐬', name: 'Dolphin', category: 'animals', tags: ['dolphin', 'ocean'] },
  { emoji: '🦈', name: 'Shark', category: 'animals', tags: ['shark', 'jaws'] },
  { emoji: '🌸', name: 'Cherry Blossom', category: 'animals', tags: ['flower', 'sakura', 'pink'] },
  { emoji: '🌹', name: 'Rose', category: 'animals', tags: ['rose', 'red', 'flower', 'romantic'] },
  { emoji: '🌺', name: 'Hibiscus', category: 'animals', tags: ['flower', 'tropical'] },
  { emoji: '🌻', name: 'Sunflower', category: 'animals', tags: ['sunflower', 'summer', 'sun'] },
  { emoji: '🌲', name: 'Evergreen Tree', category: 'animals', tags: ['tree', 'forest', 'nature'] },
  { emoji: '🌴', name: 'Palm Tree', category: 'animals', tags: ['palm', 'beach', 'summer', 'vacation'] },
  { emoji: '🍀', name: 'Four Leaf Clover', category: 'animals', tags: ['luck', 'irish', 'lucky'] },
  { emoji: '🌈', name: 'Rainbow', category: 'animals', tags: ['rainbow', 'colors', 'pride'] },
  { emoji: '☀️', name: 'Sun', category: 'animals', tags: ['sun', 'bright', 'sunny', 'weather'] },
  { emoji: '🌙', name: 'Crescent Moon', category: 'animals', tags: ['moon', 'night', 'sleep'] },

  // Food & Drinks
  { emoji: '🍕', name: 'Pizza', category: 'food', tags: ['pizza', 'cheese', 'fast food'] },
  { emoji: '🍔', name: 'Hamburger', category: 'food', tags: ['burger', 'beef', 'fast food'] },
  { emoji: '🍟', name: 'French Fries', category: 'food', tags: ['fries', 'potato'] },
  { emoji: '🌭', name: 'Hot Dog', category: 'food', tags: ['hotdog', 'fast food'] },
  { emoji: '🥪', name: 'Sandwich', category: 'food', tags: ['sandwich', 'lunch'] },
  { emoji: '🌮', name: 'Taco', category: 'food', tags: ['taco', 'mexican'] },
  { emoji: '🌯', name: 'Burrito', category: 'food', tags: ['burrito', 'wrap'] },
  { emoji: '🍝', name: 'Spaghetti', category: 'food', tags: ['pasta', 'italian', 'noodles'] },
  { emoji: '🍜', name: 'Steaming Bowl', category: 'food', tags: ['ramen', 'noodles', 'soup'] },
  { emoji: '🍣', name: 'Sushi', category: 'food', tags: ['sushi', 'japanese', 'fish'] },
  { emoji: '🍦', name: 'Soft Ice Cream', category: 'food', tags: ['ice cream', 'sweet', 'summer'] },
  { emoji: '🍰', name: 'Shortcake', category: 'food', tags: ['cake', 'dessert', 'sweet'] },
  { emoji: '🎂', name: 'Birthday Cake', category: 'food', tags: ['birthday', 'celebration', 'cake'] },
  { emoji: '🍩', name: 'Doughnut', category: 'food', tags: ['donut', 'glazed', 'sweet'] },
  { emoji: '🍪', name: 'Cookie', category: 'food', tags: ['cookie', 'chocolate chip', 'biscuit'] },
  { emoji: '🍫', name: 'Chocolate Bar', category: 'food', tags: ['chocolate', 'candy', 'sweet'] },
  { emoji: '🍿', name: 'Popcorn', category: 'food', tags: ['popcorn', 'movie', 'cinema'] },
  { emoji: '☕', name: 'Hot Beverage', category: 'food', tags: ['coffee', 'tea', 'cafe', 'morning'] },
  { emoji: '🧋', name: 'Bubble Tea', category: 'food', tags: ['boba', 'bubble tea', 'milk tea'] },
  { emoji: '🍺', name: 'Beer Mug', category: 'food', tags: ['beer', 'drink', 'alcohol', 'cheers'] },
  { emoji: '🍻', name: 'Clinking Beer Mugs', category: 'food', tags: ['cheers', 'toast', 'beer'] },
  { emoji: '🥂', name: 'Clinking Glasses', category: 'food', tags: ['champagne', 'celebrate', 'toast'] },
  { emoji: '🍷', name: 'Wine Glass', category: 'food', tags: ['wine', 'red wine', 'drink'] },
  { emoji: '🍹', name: 'Tropical Drink', category: 'food', tags: ['cocktail', 'vacation', 'summer'] },
  { emoji: '🍎', name: 'Red Apple', category: 'food', tags: ['apple', 'fruit', 'healthy'] },
  { emoji: '🍌', name: 'Banana', category: 'food', tags: ['banana', 'fruit'] },
  { emoji: '🍉', name: 'Watermelon', category: 'food', tags: ['melon', 'summer', 'fruit'] },
  { emoji: '🍓', name: 'Strawberry', category: 'food', tags: ['berry', 'sweet', 'fruit'] },

  // Activities & Fun
  { emoji: '🎉', name: 'Party Popper', category: 'activities', tags: ['party', 'congrats', 'celebrate', 'yay'] },
  { emoji: '🎊', name: 'Confetti Ball', category: 'activities', tags: ['confetti', 'celebration'] },
  { emoji: '🎈', name: 'Balloon', category: 'activities', tags: ['balloon', 'party', 'birthday'] },
  { emoji: '🎁', name: 'Wrapped Gift', category: 'activities', tags: ['present', 'gift', 'box'] },
  { emoji: '🏆', name: 'Trophy', category: 'activities', tags: ['winner', 'first', 'champion', 'gold'] },
  { emoji: '🥇', name: '1st Place Medal', category: 'activities', tags: ['gold', 'first', 'win'] },
  { emoji: '⚽', name: 'Soccer Ball', category: 'activities', tags: ['football', 'soccer', 'sports'] },
  { emoji: '🏀', name: 'Basketball', category: 'activities', tags: ['basketball', 'hoop', 'nba'] },
  { emoji: '🏈', name: 'American Football', category: 'activities', tags: ['football', 'nfl'] },
  { emoji: '⚾', name: 'Baseball', category: 'activities', tags: ['baseball', 'mlb'] },
  { emoji: '🎾', name: 'Tennis', category: 'activities', tags: ['tennis', 'racket'] },
  { emoji: '🎮', name: 'Video Game', category: 'activities', tags: ['gaming', 'controller', 'play'] },
  { emoji: '🎲', name: 'Game Die', category: 'activities', tags: ['dice', 'boardgame', 'luck'] },
  { emoji: '🎯', name: 'Bullseye', category: 'activities', tags: ['darts', 'target', 'hit', 'goal'] },
  { emoji: '🎨', name: 'Artist Palette', category: 'activities', tags: ['art', 'paint', 'design'] },
  { emoji: '🎬', name: 'Clapper Board', category: 'activities', tags: ['movie', 'film', 'cinema'] },
  { emoji: '🎤', name: 'Microphone', category: 'activities', tags: ['sing', 'karaoke', 'mic', 'voice'] },
  { emoji: '🎧', name: 'Headphone', category: 'activities', tags: ['music', 'listen', 'audio'] },
  { emoji: '🎸', name: 'Guitar', category: 'activities', tags: ['music', 'rock', 'instrument'] },

  // Travel & Objects
  { emoji: '🚀', name: 'Rocket', category: 'objects', tags: ['rocket', 'space', 'to the moon', 'launch', 'fast'] },
  { emoji: '✈️', name: 'Airplane', category: 'objects', tags: ['plane', 'flight', 'travel', 'trip'] },
  { emoji: '🚗', name: 'Automobile', category: 'objects', tags: ['car', 'drive', 'trip'] },
  { emoji: '🏎️', name: 'Racing Car', category: 'objects', tags: ['f1', 'race', 'fast'] },
  { emoji: '🚲', name: 'Bicycle', category: 'objects', tags: ['bike', 'cycling', 'ride'] },
  { emoji: '💡', name: 'Light Bulb', category: 'objects', tags: ['idea', 'light', 'bright', 'smart'] },
  { emoji: '📱', name: 'Mobile Phone', category: 'objects', tags: ['phone', 'iphone', 'text'] },
  { emoji: '💻', name: 'Laptop', category: 'objects', tags: ['computer', 'code', 'work', 'tech'] },
  { emoji: '💰', name: 'Money Bag', category: 'objects', tags: ['money', 'cash', 'rich', 'wealth'] },
  { emoji: '💎', name: 'Gem Stone', category: 'objects', tags: ['diamond', 'gem', 'precious', 'shine'] },
  { emoji: '🔔', name: 'Bell', category: 'objects', tags: ['notification', 'alert', 'ring'] },
  { emoji: '📸', name: 'Camera', category: 'objects', tags: ['photo', 'snap', 'picture'] },
  { emoji: '🔒', name: 'Locked', category: 'objects', tags: ['lock', 'security', 'safe', 'e2e'] },
  { emoji: '🔑', name: 'Key', category: 'objects', tags: ['key', 'unlock', 'access', 'secret'] }
];



function chatDisplay(c) {
  if (c.type === 'self') return { title: 'Saved Messages', sub: 'Your personal saved notes & media', ava: { emoji: '⭐', avatarColor: '#7c5cff' }, e2e: true };
  if (c.type === 'dm') {
    const rawOther = (c.members || []).find(m => {
      const mid = typeof m === 'object' && m ? m.id : m;
      return mid && mid !== S.user?.id;
    }) || c.members?.[0] || { name: 'User', avatarColor: '#7c5cff' };
    const otherId = typeof rawOther === 'object' && rawOther ? rawOther.id : rawOther;
    const userFromStore = otherId ? S.users.get(otherId) : null;
    const otherObj = typeof rawOther === 'object' && rawOther ? rawOther : {};
    const other = userFromStore ? { ...otherObj, ...userFromStore } : (userFromStore || otherObj || { id: otherId, name: 'Contact', avatarColor: '#7c5cff' });
    if (!other.id && otherId) other.id = otherId;
    return {
      title: other.name || 'Contact',
      sub: other.online ? 'online' : (other.lastSeen ? `last seen ${fmtTime(other.lastSeen)}` : `@${other.username || ''}`),
      ava: other,
      e2e: true,
      peer: other
    };
  }
  if (c.type === 'group') {
    return {
      title: c.name,
      sub: `${(c.members || []).length} members · key v${c.keyVersion}`,
      ava: { name: c.name, emoji: c.emoji, avatar: c.avatar, avatarColor: c.avatarColor },
      e2e: true
    };
  }
  return {
    title: c.name,
    sub: `@${c.handle} · ${c.followerCount || 0} followers`,
    ava: { name: c.name, emoji: c.emoji || '🔥', avatar: c.avatar, avatarColor: c.avatarColor },
    e2e: false
  };
}

function msgPreviewText(m) {
  if (!m) return 'No messages yet';
  if (m.deleted) return 'This message was deleted';
  if (m.kind === 'system') return m.body || '';
  const p = m._plain || m.body || {};
  if (m.viewOnce) return m.kind === 'video' ? '👁️ One-View video' : '👁️ One-View photo';
  switch (m.kind) {
    case 'call': {
      const info = m.callInfo || (() => { try { return JSON.parse(m.body); } catch { return {}; } })();
      const isVideo = info.mode === 'video';
      const iconStr = isVideo ? '📹' : '📞';
      const label = isVideo ? 'Video call' : 'Voice call';
      if (info.status === 'completed' && info.duration) {
        return `${iconStr} ${label} (${typeof formatDuration === 'function' ? formatDuration(info.duration) : info.duration + 's'})`;
      }
      return `${iconStr} Missed ${label.toLowerCase()}`;
    }
    case 'image': return '📷 ' + (p.caption || 'Photo');
    case 'video': return '🎬 ' + (p.caption || 'Video');
    case 'audio': return '🎙️ Voice note';
    case 'file': return '📎 ' + (p.name || 'File');
    case 'location': return '📍 ' + (p.label || 'Location');
    case 'live': return '🛰️ Live location';
    case 'poll': return '📊 Poll: ' + (p.question || '');
    case 'todo': return '✅ To-Do: ' + (p.title || '');
    case 'story-mention': {
      const isUnavailable = Boolean(m.storyUnavailable || p.unavailable);
      if (isUnavailable) return '🚫 Story unavailable';
      return '📸 Mentioned you in their story';
    }
    case 'sticker': return (p.emoji ? p.emoji + ' ' : '⭐ ') + 'Sticker';
    case 'gif': return '🎬 GIF' + (p.caption ? ': ' + p.caption : '');
    default: return p.text || '';
  }
}

// ---------------- In-Chat Search & Highlighting ----------------
let currentSearchMatches = [];
let currentSearchIdx = 0;

function highlightMatches(text, query) {
  if (!text) return '';
  if (!query) return esc(text);
  const qClean = query.trim();
  if (!qClean) return esc(text);
  const qEsc = qClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${qEsc})`, 'gi');
  const parts = String(text).split(regex);
  return parts.map(part =>
    regex.test(part) ? `<mark class="chat-match-highlight">${esc(part)}</mark>` : esc(part)
  ).join('');
}

function setupChatSearch() {
  const bar = $('#chatSearchBar');
  const inp = $('#chatSearchInput');
  const countEl = $('#chatSearchCount');
  if (!bar || !inp) return;

  function doSearch() {
    const q = inp.value.trim().toLowerCase();
    S.chatSearchQuery = q;
    renderMessages();
    if (!q) {
      currentSearchMatches = [];
      currentSearchIdx = 0;
      if (countEl) countEl.textContent = '';
      return;
    }
    const marks = Array.from(document.querySelectorAll('#msgsInner mark.chat-match-highlight'));
    currentSearchMatches = marks;
    if (!marks.length) {
      if (countEl) countEl.textContent = '0 matches';
      return;
    }
    currentSearchIdx = 0;
    updateSearchMatch();
  }

  function updateSearchMatch() {
    if (!currentSearchMatches.length) return;
    document.querySelectorAll('#msgsInner mark.chat-match-highlight').forEach(m => m.classList.remove('active-match'));
    const target = currentSearchMatches[currentSearchIdx];
    if (target) {
      target.classList.add('active-match');
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (countEl) countEl.textContent = `${currentSearchIdx + 1} of ${currentSearchMatches.length}`;
    }
  }

  inp.oninput = doSearch;
  inp.onkeydown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!currentSearchMatches.length) return;
      if (e.shiftKey) {
        currentSearchIdx = (currentSearchIdx - 1 + currentSearchMatches.length) % currentSearchMatches.length;
      } else {
        currentSearchIdx = (currentSearchIdx + 1) % currentSearchMatches.length;
      }
      updateSearchMatch();
    } else if (e.key === 'Escape') {
      closeChatSearch();
    }
  };

  const prevBtn = $('#searchPrevMatch');
  if (prevBtn) {
    prevBtn.onclick = () => {
      if (!currentSearchMatches.length) return;
      currentSearchIdx = (currentSearchIdx - 1 + currentSearchMatches.length) % currentSearchMatches.length;
      updateSearchMatch();
    };
  }

  const nextBtn = $('#searchNextMatch');
  if (nextBtn) {
    nextBtn.onclick = () => {
      if (!currentSearchMatches.length) return;
      currentSearchIdx = (currentSearchIdx + 1) % currentSearchMatches.length;
      updateSearchMatch();
    };
  }

  const closeBtn = $('#closeChatSearch');
  if (closeBtn) closeBtn.onclick = closeChatSearch;
}

function openChatSearch() {
  const bar = $('#chatSearchBar');
  if (!bar) return;
  bar.classList.remove('hidden');
  const inp = $('#chatSearchInput');
  if (inp) {
    inp.focus();
    inp.select();
  }
}

function closeChatSearch() {
  const bar = $('#chatSearchBar');
  if (bar) bar.classList.add('hidden');
  S.chatSearchQuery = '';
  renderMessages();
}

// ---------------- Chat Actions: Accept Request, Mark Friend, Mute, Block, Clear & Delete ----------------
async function acceptChatRequest(chatId) {
  const c = S.chats.get(chatId);
  if (c) {
    c.isAccepted = true;
    c.acceptedBy = [...new Set([...(c.acceptedBy || []), S.user?.id])];
  }
  if (S.activeChatId === chatId) {
    const savedScroll = $('#msgsScroll')?.scrollTop;
    renderConvoShell();
    renderMessages('preserve');
    if (savedScroll != null && $('#msgsScroll')) {
      $('#msgsScroll').scrollTop = savedScroll;
    }
    if (S.infoOpen) renderInfoPane();
  }
  renderChatList();
  SoundFX?.play('friend');

  try {
    const res = await api(`/api/chats/${chatId}/accept`, { method: 'POST' });
    const chatObj = res.chat || res;
    if (chatObj && chatObj.id) {
      S.chats.set(chatId, { ...(c || {}), ...chatObj, isAccepted: true });
    }
    toast('Chat request accepted! You can now chat freely.', 'ok');
    renderChatList();
  } catch (e) {
    if (c) c.isAccepted = false;
    renderConvoShell();
    renderChatList();
    toast(e.message || 'Could not accept chat', 'err');
  }
}

async function togglePinChat(chatId) {
  try {
    const res = await api(`/api/chats/${chatId}/pin-chat`, { method: 'POST' });
    if (S.user) S.user.pinnedChats = res.pinnedChats || [];
    const c = S.chats.get(chatId);
    if (c) c.isPinnedChat = res.isPinnedChat;
    SoundFX?.play('toggle');
    renderChatList();
    if (S.infoOpen && S.activeChatId === chatId) renderInfoPane();
  } catch (err) {
    toast(err.message || 'Could not pin chat', 'err');
  }
}

async function toggleMuteChat(chatId) {
  try {
    const res = await api(`/api/chats/${chatId}/mute`, { method: 'POST' });
    if (S.user) S.user.mutedChats = res.mutedChats || [];
    const c = S.chats.get(chatId);
    if (c) c.isMuted = res.isMuted;
    SoundFX?.play('toggle');
    renderChatList();
    if (S.activeChatId === chatId) {
      renderConvoHead();
      if (S.infoOpen) renderInfoPane();
    }
  } catch (e) {
    toast(e.message || 'Could not update mute state', 'err');
  }
}

async function clearChatHistory(chatId) {
  try {
    await api(`/api/chats/${chatId}/clear`, { method: 'POST' });
    SoundFX?.play('delete');
    S.msgs.set(chatId, []);
    const c = S.chats.get(chatId);
    if (c) c.lastMessage = null;
    toast('Chat history cleared', 'ok');
    renderChatList();
    if (S.activeChatId === chatId) {
      renderMessages();
      updateInfoPaneCounters(chatId);
    }
  } catch (e) {
    toast(e.message || 'Could not clear chat', 'err');
  }
}

function setInfoPaneVisibility(open) {
  S.infoOpen = Boolean(open);
  const pane = $('#infoPane');
  const resizer = $('#resizerRight');
  const btn = $('#infoBtn');
  if (pane) {
    pane.classList.toggle('hidden', !S.infoOpen);
    if (!S.infoOpen) {
      pane.innerHTML = '';
      delete pane.dataset.chatId;
    }
  }
  if (resizer) resizer.classList.toggle('hidden', !S.infoOpen);
  if (btn) btn.classList.toggle('active', S.infoOpen);
  if (S.infoOpen) renderInfoPane();
}

async function deleteOrLeaveChat(chatId) {
  const c = S.chats.get(chatId);
  if (!c) return;
  try {
    await api(`/api/chats/${chatId}`, { method: 'DELETE' });
    SoundFX?.play('delete');
    S.chats.delete(chatId);
    S.msgs.delete(chatId);
    if (S.activeChatId === chatId) {
      S.activeChatId = null;
      setInfoPaneVisibility(false);
      $('#view-chats')?.classList.remove('convo-open');
      $('#convo')?.classList.add('hidden');
      $('#chatEmpty')?.classList.remove('hidden');
    }
    renderChatList();
    toast(c.type === 'group' ? 'Left / deleted group' : (c.type === 'channel' ? 'Removed ZovioCast' : 'Chat deleted'), 'ok');
  } catch (e) {
    toast(e.message || 'Could not delete chat', 'err');
  }
}

function openChatActionMenu(anchorEl, chatId, ev) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  $$('.chat-ctx-menu').forEach(el => el.remove());
  const c = S.chats.get(chatId);
  if (!c) return;
  const d = chatDisplay(c);
  const peer = d.peer;
  const isMuted = isChatMuted(c.id);
  const amAdmin = c.ownerId === S.user.id || (c.admins || []).includes(S.user.id) || c.isAdmin;

  const isPinned = Boolean(c.isPinnedChat);
  const items = [
    {
      act: 'pin-chat',
      icon: 'pin',
      label: isPinned ? 'Unpin from Top' : 'Pin to Top'
    }
  ];
  if (c.type === 'dm' && peer) {
    const isFriend = isUserFriend(peer.id);
    const isBlocked = isUserBlocked(peer.id);
    const isAccepted = c.isAccepted !== false || isFriend || c.ownerId === S.user.id;
    if (!isAccepted) {
      items.push({ act: 'accept', icon: 'check', label: 'Continue with Chat', cls: 'ok' });
    }
    items.push({
      act: 'friend',
      icon: isFriend ? 'userCheck' : 'userPlus',
      label: isFriend ? 'Remove from Friends' : 'Mark as Friend (Share Status)',
      cls: isFriend ? '' : 'ok'
    });
    items.push({
      act: 'mute',
      icon: isMuted ? 'bell' : 'bellOff',
      label: isMuted ? 'Unmute Notifications' : 'Mute Notifications'
    });
    items.push({
      act: 'clear',
      icon: 'refresh',
      label: 'Clear Chat History'
    });
    items.push({
      act: 'block',
      icon: isBlocked ? 'shieldCheck' : 'ban',
      label: isBlocked ? `Unblock @${peer.username}` : `Block @${peer.username}`,
      cls: isBlocked ? '' : 'danger'
    });
    items.push({
      act: 'delete',
      icon: 'trash',
      label: 'Delete Chat',
      cls: 'danger'
    });
  } else if (c.type === 'group') {
    items.push({
      act: 'mute',
      icon: isMuted ? 'bell' : 'bellOff',
      label: isMuted ? 'Unmute Group' : 'Mute Group'
    });
    items.push({
      act: 'clear',
      icon: 'refresh',
      label: 'Clear Chat History'
    });
    if (c.ownerId !== S.user.id) {
      items.push({ act: 'leave', icon: 'logOut', label: 'Leave Group', cls: 'danger' });
    }
    if (amAdmin) {
      items.push({ act: 'delete', icon: 'trash', label: 'Delete Group', cls: 'danger' });
    }
  } else if (c.type === 'channel') {
    items.push({
      act: 'mute',
      icon: isMuted ? 'bell' : 'bellOff',
      label: isMuted ? 'Unmute ZovioCast' : 'Mute ZovioCast'
    });
    items.push({
      act: 'follow',
      icon: 'star',
      label: c.isFollowing ? 'Unfollow ZovioCast' : 'Follow ZovioCast'
    });
    items.push({
      act: 'clear',
      icon: 'refresh',
      label: 'Clear Feed History'
    });
    if (amAdmin) {
      items.push({ act: 'delete', icon: 'trash', label: 'Delete ZovioCast', cls: 'danger' });
    }
  } else if (c.type === 'self') {
    items.push({ act: 'clear', icon: 'refresh', label: 'Clear Saved Messages' });
    items.push({ act: 'delete', icon: 'trash', label: 'Remove from List', cls: 'danger' });
  }

  const menu = document.createElement('div');
  menu.className = 'chat-ctx-menu';
  menu.innerHTML = `
    <div class="chat-ctx-head">${esc(d.title)}</div>
    ${items.map(it => `
      <button type="button" class="chat-ctx-item ${it.cls || ''}" data-act="${it.act}">
        ${it.icon ? icon(it.icon) : ''}
        <span>${esc(it.label)}</span>
      </button>`).join('')}
  `;
  document.body.appendChild(menu);

  const rect = anchorEl ? anchorEl.getBoundingClientRect() : { left: ev?.clientX || 120, bottom: ev?.clientY || 120, right: ev?.clientX || 120 };
  const mRect = menu.getBoundingClientRect();
  let top = rect.bottom + 6;
  let left = Math.min(window.innerWidth - mRect.width - 12, Math.max(12, rect.right - mRect.width + 24));
  if (top + mRect.height > window.innerHeight - 12) {
    top = Math.max(12, rect.top - mRect.height - 6);
  }
  menu.style.top = `${top}px`;
  menu.style.left = `${left}px`;

  const closeMenu = e => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    }
  };
  setTimeout(() => document.addEventListener('click', closeMenu), 10);

  $$('[data-act]', menu).forEach(btn => btn.onclick = async e => {
    e.stopPropagation();
    menu.remove();
    document.removeEventListener('click', closeMenu);
    const act = btn.dataset.act;
    if (act === 'pin-chat') await togglePinChat(c.id);
    else if (act === 'accept') await acceptChatRequest(c.id);
    else if (act === 'friend' && peer) await toggleMarkFriend(peer.id);
    else if (act === 'mute') await toggleMuteChat(c.id);
    else if (act === 'clear') await clearChatHistory(c.id);
    else if (act === 'block' && peer) await toggleBlockUser(peer.id);
    else if (act === 'leave') await removeGroupMember(c, S.user.id);
    else if (act === 'follow') await toggleFollowChannel(c);
    else if (act === 'delete') await deleteOrLeaveChat(c.id);
  });
}

// ---------------- Left Pane: FireChats & FireCasts List ----------------
let _renderChatListRaf = null;
function renderChatList() {
  if (_renderChatListRaf) cancelAnimationFrame(_renderChatListRaf);
  _renderChatListRaf = requestAnimationFrame(() => {
    _renderChatListActual();
  });
}

async function _renderChatListActual() {
  const isFire = S.view === 'firecasts';
  $('#listTitle').textContent = isFire ? 'ZovioCasts' : 'ZovioChats';

  const filters = isFire
    ? [['all', 'Following'], ['discover', 'Discover']]
    : [['all', 'All'], ['dm', 'Direct'], ['group', 'Groups'], ['self', 'Saved']];

  $('#listFilters').innerHTML = filters.map(([k, label]) =>
    `<button class="chip ${S.filter === k ? 'active' : ''}" data-f="${k}">${label}</button>`
  ).join('');
  $$('#listFilters button').forEach(b => b.onclick = () => { S.filter = b.dataset.f; renderChatList(); });

  const headCallsBtn = $('#headCallsBtn');
  if (headCallsBtn) {
    headCallsBtn.style.display = isFire ? 'none' : 'inline-flex';
    headCallsBtn.classList.toggle('active', Boolean(S.showCalls && !isFire));
    headCallsBtn.onclick = () => {
      S.showCalls = !S.showCalls;
      renderChatList();
    };
  }

  // Right pane: Show FireCalls history when toggled ON, otherwise show conversation or empty state
  if (!isFire && S.showCalls) {
    $('#chatEmpty')?.classList.add('hidden');
    $('#convo')?.classList.add('hidden');
    const pane = $('#chatCallsPane');
    if (pane) {
      pane.classList.remove('hidden');
      if (typeof renderCallsView === 'function') renderCallsView('#chatCallsPane');
    }
  } else {
    $('#chatCallsPane')?.classList.add('hidden');
    if (S.activeChatId && S.chats.has(S.activeChatId)) {
      $('#convo')?.classList.remove('hidden');
      $('#chatEmpty')?.classList.add('hidden');
    } else {
      $('#convo')?.classList.add('hidden');
      $('#chatEmpty')?.classList.remove('hidden');
    }
  }

  let list = [];
  const q = (S.search || '').trim().toLowerCase();
  const qClean = q.startsWith('@') ? q.slice(1) : q;
  if (isFire && S.filter === 'discover') {
    list = await api(`/api/channels?q=${encodeURIComponent(qClean)}`).catch(() => []);
    list.forEach(c => S.chats.set(c.id, c));
  } else if (isFire) {
    // Strictly show ONLY channels that the user is following in the Following tab
    list = Array.from(S.chats.values()).filter(c => c.type === 'channel' && c.isFollowing);
    if (qClean) {
      list = list.filter(c => {
        const d = chatDisplay(c);
        return d.title.toLowerCase().includes(qClean) ||
               (d.sub && d.sub.toLowerCase().includes(q)) ||
               (c.handle && c.handle.toLowerCase().includes(qClean)) ||
               (c.name && c.name.toLowerCase().includes(qClean));
      });
    }
    list.sort((a, b) => {
      const aPin = Boolean(a.isPinnedChat || (S.user?.pinnedChats && S.user.pinnedChats.includes(a.id)));
      const bPin = Boolean(b.isPinnedChat || (S.user?.pinnedChats && S.user.pinnedChats.includes(b.id)));
      if (aPin !== bPin) return bPin ? 1 : -1;
      return (b.lastMessage?.ts || b.updatedAt || b.createdAt || 0) - (a.lastMessage?.ts || a.updatedAt || a.createdAt || 0);
    });
  } else {
    list = Array.from(S.chats.values()).filter(c => c.type !== 'channel' && !c.isDeleted && !(c.deletedBy || []).includes(S.user?.id));
    // Filter out empty incoming draft DMs (where other user clicked Chat but hasn't sent a message yet)
    list = list.filter(c => {
      if (c.type === 'dm' && c.ownerId !== S.user?.id && !c.isAccepted && !c.lastMessage) {
        return false;
      }
      return true;
    });
    if (S.filter !== 'all') list = list.filter(c => c.type === S.filter);
    if (qClean) {
      list = list.filter(c => {
        const d = chatDisplay(c);
        const matchTitle = d.title.toLowerCase().includes(qClean);
        const matchSub = d.sub && (d.sub.toLowerCase().includes(q) || d.sub.toLowerCase().includes(qClean));
        const matchPeer = d.peer && (
          (d.peer.username && d.peer.username.toLowerCase().includes(qClean)) ||
          (d.peer.name && d.peer.name.toLowerCase().includes(qClean))
        );
        const matchName = c.name && c.name.toLowerCase().includes(qClean);
        const matchMembers = (c.members || []).some(m => {
          const u = typeof m === 'object' && m ? m : S.users.get(m);
          return u && (
            (u.username && u.username.toLowerCase().includes(qClean)) ||
            (u.name && u.name.toLowerCase().includes(qClean))
          );
        });
        return matchTitle || matchSub || matchPeer || matchName || matchMembers;
      });
    }
    list.sort((a, b) => {
      const aPin = Boolean(a.isPinnedChat || (S.user?.pinnedChats && S.user.pinnedChats.includes(a.id)));
      const bPin = Boolean(b.isPinnedChat || (S.user?.pinnedChats && S.user.pinnedChats.includes(b.id)));
      if (aPin !== bPin) return bPin ? 1 : -1;
      return (b.lastMessage?.ts || b.updatedAt || b.createdAt || 0) - (a.lastMessage?.ts || a.updatedAt || a.createdAt || 0);
    });
  }

  // Update unread badges on rail
  const unreadChats = Array.from(S.chats.values()).filter(c => c.type !== 'channel' && !c.isDeleted && !(c.deletedBy || []).includes(S.user?.id)).reduce((s, c) => s + (c.unread || 0), 0);
  const unreadFire = Array.from(S.chats.values()).filter(c => c.type === 'channel' && c.isFollowing).reduce((s, c) => s + (c.unread || 0), 0);
  const bc = $('#badge-chats'), bf = $('#badge-firecasts');
  if (bc) { bc.textContent = unreadChats; bc.classList.toggle('hidden', !unreadChats); }
  if (bf) { bf.textContent = unreadFire; bf.classList.toggle('hidden', !unreadFire); }

  let extraPeopleHTML = '';
  if (!isFire && qClean) {
    const matchedPeerIds = new Set(list.map(c => chatDisplay(c).peer?.id).filter(Boolean));

    // Strictly show ONLY known users: existing contacts, friends, or mutual group members
    const knownUserIds = new Set();
    (S.user?.friends || []).forEach(fid => knownUserIds.add(fid));
    for (const c of S.chats.values()) {
      if (c.type === 'dm' || c.type === 'group') {
        (c.members || []).forEach(m => {
          const mid = typeof m === 'object' && m ? m.id : m;
          if (mid && mid !== S.user?.id) knownUserIds.add(mid);
        });
      }
    }

    const matchingUsers = Array.from(knownUserIds).map(uid => S.users.get(uid)).filter(u =>
      u &&
      u.id !== S.user?.id &&
      !matchedPeerIds.has(u.id) &&
      ((u.username && u.username.toLowerCase().includes(qClean)) ||
       (u.name && u.name.toLowerCase().includes(qClean)))
    ).slice(0, 5);

    if (matchingUsers.length) {
      extraPeopleHTML = `
        <div style="padding:10px 14px 4px;font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px">Known Contacts</div>
        ${matchingUsers.map(u => `
          <div class="chat-row" data-start-dm="${u.id}">
            ${avatarHTML(u)}
            <div class="chat-row-main">
              <div class="chat-row-top">
                <div class="chat-row-title">${esc(u.name)}</div>
                <span class="btn primary xs" style="font-size:11px;padding:3px 10px">Chat</span>
              </div>
              <div class="chat-row-sub">
                <div class="chat-row-preview">@${esc(u.username)}</div>
              </div>
            </div>
          </div>
        `).join('')}
      `;
    }
  }

  const box = $('#chatList');
  if (!list.length && !extraPeopleHTML) {
    box.innerHTML = `<div class="empty-state">
      <p>${isFire
        ? (S.filter === 'discover' ? 'No ZovioCasts match your search.' : 'You are not following any ZovioCasts yet — switch to Discover to follow channels!')
        : 'No conversations match.'}</p>
      ${isFire && S.filter !== 'discover' ? `<button class="btn primary sm" style="margin-top:10px" id="goDiscoverBtn">Explore Discover</button>` : ''}
    </div>`;
    if ($('#goDiscoverBtn', box)) $('#goDiscoverBtn', box).onclick = () => { S.filter = 'discover'; renderChatList(); };
    return;
  }

  box.innerHTML = (list.map(c => {
    const d = chatDisplay(c);
    const prev = msgPreviewText(c.lastMessage);
    const isActive = S.activeChatId === c.id;
    const isMuted = isChatMuted(c.id);
    const peer = d.peer;
    const isFriend = peer ? isUserFriend(peer.id) : false;
    const isBlocked = peer ? isUserBlocked(peer.id) : false;
    const isRequest = c.type === 'dm' && peer && c.isAccepted === false && !isFriend && c.ownerId !== S.user.id;

    const isPinned = Boolean(c.isPinnedChat || (S.user?.pinnedChats && S.user.pinnedChats.includes(c.id)));

    let statusBadges = '';
    if (isPinned) statusBadges += `<span class="chat-mini-tag pinned" title="Pinned chat">${icon('pinThumbtack')}</span>`;
    if (isRequest) statusBadges += `<span class="chat-mini-tag req" title="Message request">${icon('userPlus')}</span>`;
    if (isBlocked) statusBadges += `<span class="chat-mini-tag blocked" title="Blocked">${icon('ban')}</span>`;
    if (isMuted) statusBadges += `<span class="chat-mini-tag muted" title="Muted">${icon('bellOff')}</span>`;

    return `
      <div class="chat-row ${isActive ? 'active' : ''}" data-id="${c.id}">
        ${avatarHTML(d.ava)}
        <div class="chat-row-main">
          <div class="chat-row-top">
            <div class="chat-row-title">${esc(d.title)} ${statusBadges}</div>
            <div class="chat-row-time">${fmtTime(c.lastMessage?.ts || c.createdAt)}</div>
          </div>
          <div class="chat-row-sub">
            <div class="chat-row-preview">${esc(prev)}</div>
            ${!isActive && c.unread ? `<span class="badge">${c.unread}</span>` : (isFire && !c.isFollowing ? '<span class="pill">Follow</span>' : '')}
          </div>
        </div>
      </div>`;
  }).join('')) + extraPeopleHTML;

  $$('#chatList [data-id]').forEach(el => {
    el.onclick = () => openChat(el.dataset.id);
    el.oncontextmenu = e => openChatActionMenu(el, el.dataset.id, e);
  });

  $$('#chatList [data-start-dm]').forEach(el => {
    el.onclick = async () => {
      const u = S.users.get(el.dataset.startDm);
      if (!u) return;
      const existing = Array.from(S.chats.values()).find(c => c.type === 'dm' && (c.members || []).some(m => (typeof m === 'object' ? m.id : m) === u.id));
      if (existing) {
        openChat(existing.id);
        return;
      }
      const { keys } = await wrapNewChatKey([S.user, u]);
      const chat = await api('/api/chats/dm', { method: 'POST', body: { userId: u.id, keys } });
      if (chat && chat.id) {
        S.chats.set(chat.id, chat);
        renderChatList();
        openChat(chat.id);
      }
    };
  });
}

// ---------------- Scroll Helper ----------------
function scrollToBottom(smooth = false) {
  const sc = $('#msgsScroll');
  if (!sc) return;
  if (smooth) {
    sc.scrollTo({ top: sc.scrollHeight, behavior: 'smooth' });
  } else {
    sc.scrollTop = sc.scrollHeight;
  }
}

// ---------------- Open a Conversation ----------------
function computeMsgsSignature(list) {
  if (!Array.isArray(list) || !list.length) return '0';
  return list.map(m => {
    const rLen = m.reactions ? Object.keys(m.reactions).length : 0;
    const readLen = Array.isArray(m.readBy) ? m.readBy.length : 0;
    return `${m.id}:${m.edited || 0}:${m.deleted || 0}:${m.deletedForEveryone || 0}:${rLen}:${readLen}:${m.views || 0}`;
  }).join('|');
}

window.closeMobileChatView = () => {
  $('#view-chats')?.classList.remove('convo-open');
  S.activeChatId = null;
  S.replyTo = null;
  if (S.infoOpen && typeof setInfoPaneVisibility === 'function') {
    setInfoPaneVisibility(false);
  }
  $('#convo')?.classList.add('hidden');
  $('#chatEmpty')?.classList.remove('hidden');
  renderChatList();
};

async function openChat(chatId) {
  const c = S.chats.get(chatId);
  if (!c) return;

  // If this chat is already open and visible, ensure mobile reveals convo-open and avoid redundant reload
  const convoEl = $('#convo');
  const viewChatsEl = $('#view-chats');
  if (S.activeChatId === chatId && convoEl && !convoEl.classList.contains('hidden') && !S.showCalls) {
    if (viewChatsEl && !viewChatsEl.classList.contains('convo-open')) {
      viewChatsEl.classList.add('convo-open');
    }
    $('#msgInput')?.focus();
    return;
  }

  S.showCalls = false;
  $('#headCallsBtn')?.classList.remove('active');
  $('#chatCallsPane')?.classList.add('hidden');
  S.activeChatId = chatId;
  S.replyTo = null;
  S.userScrolledUp = false;
  S._stickToBottomUntil = Date.now() + 500;
  c.unread = 0;
  $('#view-chats').classList.add('convo-open');
  $('#chatEmpty').classList.add('hidden');
  convoEl?.classList.remove('hidden');

  // Clear previous conversation's DOM immediately before rendering shell to prevent any 1-frame flash
  const prevMsgsInner = $('#msgsInner');
  if (prevMsgsInner && convoEl?.dataset.chatId !== String(chatId)) {
    prevMsgsInner.innerHTML = '';
    const prevPinned = $('#pinnedBannerSlot');
    if (prevPinned) prevPinned.innerHTML = '';
    const prevInfoPane = $('#infoPane');
    if (prevInfoPane) {
      prevInfoPane.innerHTML = '';
      delete prevInfoPane.dataset.chatId;
    }
  }

  renderChatList();
  renderConvoShell();

  if (!S.msgs.has(chatId) && window.ZovioLocalDB && S.user?.id) {
    const localCached = await ZovioLocalDB.getChatMessages(S.user.id, chatId).catch(() => []);
    if (localCached.length && S.activeChatId === chatId && !S.msgs.has(chatId)) {
      S.msgs.set(chatId, localCached);
    }
  }

  const hadCached = S.msgs.has(chatId);
  const prevSig = hadCached ? computeMsgsSignature(S.msgs.get(chatId)) : '';

  if (hadCached) {
    const sc = $('#msgsScroll');
    if (sc) delete sc.dataset.hasScrolled;
    renderMessages('bottom');
    scrollToBottom(false);
    requestAnimationFrame(() => { if (!S.userScrolledUp) scrollToBottom(false); });
    setTimeout(() => { if (!S.userScrolledUp) scrollToBottom(false); }, 80);
  } else {
    const msgsEl = $('#msgsInner');
    if (msgsEl) {
      msgsEl.innerHTML = `
        <div class="chat-loading-shimmer" style="display:flex;flex-direction:column;gap:14px;padding:28px 24px;opacity:0.45;animation:pulse 1.4s ease-in-out infinite">
          <div style="height:40px;width:50%;background:rgba(255,255,255,0.08);border-radius:14px;align-self:flex-start"></div>
          <div style="height:52px;width:65%;background:rgba(255,255,255,0.1);border-radius:14px;align-self:flex-end"></div>
          <div style="height:36px;width:42%;background:rgba(255,255,255,0.08);border-radius:14px;align-self:flex-start"></div>
        </div>
      `;
    }
  }

  const rawMsgs = await api(`/api/chats/${chatId}/messages`);
  if (rawMsgs.length) {
    await getChatKey(c, rawMsgs[0].keyVersion || c.keyVersion || 1).catch(() => {});
  }
  await Promise.all(rawMsgs.map(m => decryptMsg(c, m).catch(() => {})));
  S.msgs.set(chatId, rawMsgs);
  if (window.ZovioLocalDB && S.user?.id) {
    ZovioLocalDB.saveChatMessages(S.user.id, chatId, rawMsgs).catch(() => {});
  }
  scheduleAutoCacheChatMedia(rawMsgs);

  // Guard in case user switched to a different chat while fetch was in flight
  if (S.activeChatId !== chatId) return;

  const newSig = computeMsgsSignature(rawMsgs);
  if (!hadCached || prevSig !== newSig) {
    const sc = $('#msgsScroll');
    const keepAtBottom = !S.userScrolledUp;
    if (sc && keepAtBottom) delete sc.dataset.hasScrolled;
    renderMessages(keepAtBottom ? 'bottom' : 'preserve');
    if (keepAtBottom) {
      scrollToBottom(false);
      requestAnimationFrame(() => { if (!S.userScrolledUp) scrollToBottom(false); });
      setTimeout(() => { if (!S.userScrolledUp) scrollToBottom(false); }, 80);
      setTimeout(() => { if (!S.userScrolledUp) scrollToBottom(false); }, 250);
    }
  }

  const canSendRead = S.user?.preferences?.readReceipts !== false &&
                      (typeof isAppPresenceActive !== 'function' || isAppPresenceActive());
  if (canSendRead) {
    api(`/api/chats/${chatId}/read`, { method: 'POST' }).catch(() => {});
  }
  if (c.type === 'channel' && rawMsgs.length) {
    api(`/api/channels/${chatId}/views`, { method: 'POST', body: { messageIds: rawMsgs.map(m => m.id) } }).catch(() => {});
  }
  if (S.infoOpen) renderInfoPane();
}

let dndInitialized = false;
let clipboardPasteInitialized = false;

function openClipboardPasteModal(initialFiles) {
  const c = S.chats.get(S.activeChatId);
  if (!c || !initialFiles || !initialFiles.length) return;

  let files = Array.from(initialFiles);
  let activeIdx = 0;
  let viewOnce = false;
  let captions = files.map(() => '');
  const objectUrls = files.map(f => URL.createObjectURL(f));

  const cleanupUrls = () => {
    objectUrls.forEach(u => { try { URL.revokeObjectURL(u); } catch {} });
  };

  $('#clipboardPasteModal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'clipboardPasteModal';
  modal.className = 'clipboard-paste-overlay';

  const renderModal = () => {
    const curFile = files[activeIdx];
    const curUrl = objectUrls[activeIdx];
    const isVid = (curFile.type || '').startsWith('video/');
    const isImg = (curFile.type || '').startsWith('image/');

    modal.innerHTML = `
      <div class="clipboard-paste-card glass-panel">
        <div class="clipboard-paste-head">
          <div class="row gap-s align-center">
            <span style="font-size:18px">📋</span>
            <div>
              <strong style="font-size:15px">Send Media from Clipboard</strong>
              <div class="muted xs">Sending to <b>${esc(chatDisplay(c).title)}</b> · ${files.length} item${files.length > 1 ? 's' : ''}</div>
            </div>
          </div>
          <button type="button" class="icon-btn" id="cpCloseBtn" title="Cancel (Esc)">${icon('close')}</button>
        </div>

        <div class="clipboard-paste-stage">
          ${isVid
            ? `<video src="${curUrl}" controls autoplay muted playsinline class="clipboard-paste-preview-media"></video>`
            : isImg
              ? `<img src="${curUrl}" alt="Pasted image" class="clipboard-paste-preview-media">`
              : `<div class="file-card" style="padding:24px"><div class="file-ico">${icon('file')}</div><div class="file-info"><div class="file-name">${esc(curFile.name)}</div><div class="file-sub">${fmtBytes(curFile.size)}</div></div></div>`
          }
        </div>

        ${files.length > 1 ? `
          <div class="clipboard-paste-thumbs">
            ${files.map((f, i) => `
              <div class="cp-thumb-item ${i === activeIdx ? 'active' : ''}" data-cpidx="${i}">
                ${(f.type || '').startsWith('image/') ? `<img src="${objectUrls[i]}" alt="">` : `<span>🎬</span>`}
                <button type="button" class="cp-thumb-del" data-cpdel="${i}" title="Remove">✕</button>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="clipboard-paste-footer">
          <div class="row gap-s align-center" style="width:100%">
            <input type="text" id="cpCaptionInput" class="cp-caption-input" placeholder="Add a caption… (Press Enter to send)" value="${esc(captions[activeIdx] || '')}">
            <button type="button" class="cp-viewonce-btn ${viewOnce ? 'active' : ''}" id="cpViewOnceBtn" title="Toggle One-View (Self-destructs after 1 view)">
              <span class="vo-ring-mini">1</span>
              <span>One-View</span>
            </button>
            <button type="button" class="btn primary glow" id="cpSendBtn" style="height:42px;padding:0 20px;border-radius:12px;font-weight:800;display:flex;align-items:center;gap:6px">
              ${icon('send')} <span>Send</span>
            </button>
          </div>
        </div>
      </div>
    `;

    hydrateIcons(modal);

    const capIn = $('#cpCaptionInput', modal);
    if (capIn) {
      capIn.oninput = e => { captions[activeIdx] = e.target.value; };
      capIn.onkeydown = e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          $('#cpSendBtn', modal)?.click();
        }
      };
      setTimeout(() => capIn.focus(), 30);
    }

    $('#cpCloseBtn', modal).onclick = closePasteModal;
    $('#cpViewOnceBtn', modal).onclick = () => {
      viewOnce = !viewOnce;
      renderModal();
    };

    $$('[data-cpidx]', modal).forEach(el => {
      el.onclick = e => {
        if (e.target.closest('[data-cpdel]')) return;
        activeIdx = Number(el.dataset.cpidx);
        renderModal();
      };
    });

    $$('[data-cpdel]', modal).forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        const idx = Number(btn.dataset.cpdel);
        try { URL.revokeObjectURL(objectUrls[idx]); } catch {}
        files.splice(idx, 1);
        objectUrls.splice(idx, 1);
        captions.splice(idx, 1);
        if (!files.length) return closePasteModal();
        if (activeIdx >= files.length) activeIdx = files.length - 1;
        renderModal();
      };
    });

    $('#cpSendBtn', modal).onclick = async () => {
      const btn = $('#cpSendBtn', modal);
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block"></span> <span>Sending…</span>`;
      const toSend = files.map((f, i) => ({ file: f, caption: (captions[i] || captions[0] || '').trim() }));
      closePasteModal();
      for (const item of toSend) {
        await uploadEncryptedFile(item.file, { viewOnce, caption: item.caption });
      }
    };
  };

  const onKey = e => {
    if (e.key === 'Escape') closePasteModal();
  };

  const closePasteModal = () => {
    window.removeEventListener('keydown', onKey);
    cleanupUrls();
    modal.remove();
  };

  window.addEventListener('keydown', onKey);
  document.body.appendChild(modal);
  renderModal();
}

function setupDragAndDrop() {
  const pane = $('#chatPane');
  const overlay = $('#dragDropOverlay');

  if (!clipboardPasteInitialized) {
    clipboardPasteInitialized = true;
    window.addEventListener('paste', e => {
      // Only intercept media paste when in an active conversation and not inside status studio or whiteboard
      if (!S.activeChatId || (S.view !== 'chats' && S.view !== 'firecasts')) return;
      if ($('#statusStudioModal') || $('#clipboardPasteModal')) return;

      const cd = e.clipboardData;
      if (!cd) return;

      const mediaFiles = [];
      if (cd.items && cd.items.length) {
        for (const item of Array.from(cd.items)) {
          if (item.kind === 'file') {
            const f = item.getAsFile();
            if (f) {
              const ext = (f.type || '').split('/')[1] || 'png';
              const namedFile = f.name && f.name !== 'image.png'
                ? f
                : new File([f], `clipboard-${Date.now()}.${ext.replace(/[^a-z0-9]/gi, '')}`, { type: f.type || 'image/png' });
              mediaFiles.push(namedFile);
            }
          }
        }
      } else if (cd.files && cd.files.length) {
        mediaFiles.push(...Array.from(cd.files));
      }

      if (mediaFiles.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        openClipboardPasteModal(mediaFiles);
      }
    });
  }

  if (!pane || !overlay || dndInitialized) return;
  dndInitialized = true;

  let dragCounter = 0;

  pane.addEventListener('dragenter', e => {
    e.preventDefault();
    if (!S.activeChatId) return;
    dragCounter++;
    overlay.classList.remove('hidden');
  });

  pane.addEventListener('dragover', e => {
    e.preventDefault();
  });

  pane.addEventListener('dragleave', e => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      overlay.classList.add('hidden');
    }
  });

  pane.addEventListener('drop', async e => {
    e.preventDefault();
    dragCounter = 0;
    overlay.classList.add('hidden');
    if (!S.activeChatId) return;
    const files = Array.from(e.dataTransfer.files || []);
    if (!files.length) return;
    uploadMultipleEncryptedFiles(files);
  });
}

// ==========================================================================
// Stickers & GIFs Library & Drawer (GIPHY API Powered)
// ==========================================================================

const CURATED_STICKERS = [
  // Fire & Hype
  { id: 'fire', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.webp', emoji: '🔥', title: 'Fire Flame', category: 'fire', tags: ['fire', 'flame', 'lit', 'hot', 'burn'] },
  { id: 'rocket', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.webp', emoji: '🚀', title: 'Rocket', category: 'fire', tags: ['rocket', 'launch', 'moon', 'fast', 'speed'] },
  { id: 'sparkles', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2728/512.webp', emoji: '✨', title: 'Sparkles', category: 'fire', tags: ['sparkles', 'magic', 'shine', 'glow', 'star'] },
  { id: 'hundred', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4af/512.webp', emoji: '💯', title: '100 Score', category: 'fire', tags: ['100', 'hundred', 'perfect', 'score', 'real'] },
  { id: 'zap', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/26a1/512.webp', emoji: '⚡', title: 'Lightning Bolt', category: 'fire', tags: ['lightning', 'thunder', 'bolt', 'electric', 'power'] },
  { id: 'boom', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4a5/512.webp', emoji: '💥', title: 'Boom Explosion', category: 'fire', tags: ['boom', 'explode', 'blast', 'pow', 'collision'] },
  { id: 'hot_face', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f975/512.webp', emoji: '🥵', title: 'Hot Face', category: 'fire', tags: ['hot', 'sweat', 'spicy', 'heat', 'burning'] },

  // Reactions & Memes
  { id: 'joy', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.webp', emoji: '😂', title: 'Laughing Tears', category: 'reactions', tags: ['laugh', 'lol', 'funny', 'tears', 'crying', 'haha', 'lmao'] },
  { id: 'rofl', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f923/512.webp', emoji: '🤣', title: 'Rolling Laughing', category: 'reactions', tags: ['rofl', 'rolling', 'laugh', 'lol', 'hilarious'] },
  { id: 'mindblown', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f92f/512.webp', emoji: '🤯', title: 'Mind Blown', category: 'reactions', tags: ['mind blown', 'shock', 'wow', 'crazy', 'insane'] },
  { id: 'party', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f973/512.webp', emoji: '🥳', title: 'Party Time', category: 'reactions', tags: ['party', 'celebrate', 'bday', 'yay', 'happy'] },
  { id: 'cool', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60e/512.webp', emoji: '😎', title: 'Cool Shades', category: 'reactions', tags: ['cool', 'shades', 'chill', 'swagger', 'boss'] },
  { id: 'clap', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44f/512.webp', emoji: '👏', title: 'Applause', category: 'reactions', tags: ['clap', 'applause', 'bravo', 'congrats', 'cheers'] },
  { id: 'thumbsup', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44d/512.webp', emoji: '👍', title: 'Thumbs Up', category: 'reactions', tags: ['yes', 'thumbs up', 'approve', 'ok', 'good', 'agree'] },
  { id: 'popcorn', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f37f/512.webp', emoji: '🍿', title: 'Popcorn', category: 'reactions', tags: ['popcorn', 'drama', 'movie', 'eating', 'watching'] },
  { id: 'skull', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f480/512.webp', emoji: '💀', title: 'Dead Skull', category: 'reactions', tags: ['dead', 'skull', 'dying', 'skeleton', 'funny'] },
  { id: 'melting', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1fae0/512.webp', emoji: '🫠', title: 'Melting Face', category: 'reactions', tags: ['melting', 'hot', 'embarrassed', 'awkward', 'disappear'] },
  { id: 'salute', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1fae1/512.webp', emoji: '🫡', title: 'Salute', category: 'reactions', tags: ['salute', 'respect', 'yes sir', 'honor', 'roger'] },
  { id: 'sob', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f62d/512.webp', emoji: '😭', title: 'Loud Crying', category: 'reactions', tags: ['cry', 'tears', 'sad', 'crying', 'sob', 'bawling'] },
  { id: 'smirk', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60f/512.webp', emoji: '😏', title: 'Smirking Face', category: 'reactions', tags: ['smirk', 'flirt', 'sly', 'cheeky', 'clever'] },
  { id: 'wink', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f609/512.webp', emoji: '😉', title: 'Winking Face', category: 'reactions', tags: ['wink', 'winking', 'flirt', 'joke', 'playful'] },
  { id: 'eyes', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f440/512.webp', emoji: '👀', title: 'Looking Eyes', category: 'reactions', tags: ['eyes', 'look', 'peek', 'shifty', 'watch'] },
  { id: 'monocle', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f9d0/512.webp', emoji: '🧐', title: 'Thinking Monocle', category: 'reactions', tags: ['think', 'smart', 'analyze', 'curious', 'hmm'] },
  { id: 'shush', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f92b/512.webp', emoji: '🤫', title: 'Shushing Secret', category: 'reactions', tags: ['shush', 'quiet', 'secret', 'silence', 'shh'] },
  { id: 'clown', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f921/512.webp', emoji: '🤡', title: 'Clown Face', category: 'reactions', tags: ['clown', 'fool', 'joke', 'circus', 'silly'] },

  // Cute & Animals
  { id: 'catjoy', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f638/512.webp', emoji: '😸', title: 'Grinning Cat', category: 'animals', tags: ['cat', 'kitten', 'cute', 'smile', 'happy'] },
  { id: 'dog', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f415_200d_1f9ba/512.webp', emoji: '🐕', title: 'Cute Doggy', category: 'animals', tags: ['dog', 'puppy', 'cute', 'pet', 'woof'] },
  { id: 'panda', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f43c/512.webp', emoji: '🐼', title: 'Happy Panda', category: 'animals', tags: ['panda', 'bear', 'cute', 'bamboo'] },
  { id: 'bear', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f43b/512.webp', emoji: '🐻', title: 'Cute Bear', category: 'animals', tags: ['bear', 'teddy', 'cute', 'cozy'] },
  { id: 'fox', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f98a/512.webp', emoji: '🦊', title: 'Clever Fox', category: 'animals', tags: ['fox', 'foxy', 'cute', 'wild', 'orange'] },
  { id: 'lion', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f981/512.webp', emoji: '🦁', title: 'Brave Lion', category: 'animals', tags: ['lion', 'king', 'cute', 'roar', 'mane'] },
  { id: 'frog', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f438/512.webp', emoji: '🐸', title: 'Happy Frog', category: 'animals', tags: ['frog', 'toad', 'cute', 'green', 'ribbit'] },
  { id: 'monkey', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f648/512.webp', emoji: '🙈', title: 'See-No-Evil Monkey', category: 'animals', tags: ['monkey', 'shy', 'cute', 'hide', 'oops'] },
  { id: 'owl', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f989/512.webp', emoji: '🦉', title: 'Wise Owl', category: 'animals', tags: ['owl', 'bird', 'cute', 'wise', 'night'] },
  { id: 'butterfly', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f98b/512.webp', emoji: '🦋', title: 'Flutter Butterfly', category: 'animals', tags: ['butterfly', 'flutter', 'cute', 'wings', 'nature'] },
  { id: 'unicorn', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f984/512.webp', emoji: '🦄', title: 'Magic Unicorn', category: 'animals', tags: ['unicorn', 'magic', 'rainbow', 'fantasy'] },
  { id: 'ghost', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f47b/512.webp', emoji: '👻', title: 'Playful Ghost', category: 'animals', tags: ['ghost', 'spooky', 'boo', 'halloween', 'play'] },

  // Love & Affection
  { id: 'heartglow', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2764_fe0f/512.webp', emoji: '❤️', title: 'Beating Heart', category: 'love', tags: ['love', 'heart', 'romance', 'affection', 'red heart'] },
  { id: 'hearteyes', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60d/512.webp', emoji: '😍', title: 'Heart Eyes', category: 'love', tags: ['heart eyes', 'love', 'in love', 'adoring', 'crush'] },
  { id: 'holdingtears', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f979/512.webp', emoji: '🥹', title: 'Touched Tears', category: 'love', tags: ['pleading', 'proud', 'tears', 'sweet', 'thank you'] },
  { id: 'heart_hands', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1faf6/512.webp', emoji: '🫶', title: 'Heart Hands', category: 'love', tags: ['heart', 'hands', 'love', 'support', 'appreciation'] },
  { id: 'smiling_face_with_hearts', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f970/512.webp', emoji: '🥰', title: 'Surrounded by Hearts', category: 'love', tags: ['love', 'hearts', 'warm', 'blushing', 'adore'] },
  { id: 'kiss', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f618/512.webp', emoji: '😘', title: 'Blowing Kiss', category: 'love', tags: ['kiss', 'blow kiss', 'love', 'sweet', 'xoxo'] },
  { id: 'kiss_mark', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f48b/512.webp', emoji: '💋', title: 'Kiss Mark', category: 'love', tags: ['kiss', 'lipstick', 'sexy', 'muah', 'love'] },
  { id: 'sparkling_heart', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f496/512.webp', emoji: '💖', title: 'Sparkling Heart', category: 'love', tags: ['sparkle', 'heart', 'glitter', 'pink', 'love'] },
  { id: 'fireheart', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2764_fe0f_200d_1f525/512.webp', emoji: '❤️‍🔥', title: 'Heart on Fire', category: 'love', tags: ['fire', 'heart', 'passion', 'burning love'] },
  { id: 'brokenheart', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f494/512.webp', emoji: '💔', title: 'Broken Heart', category: 'love', tags: ['broken heart', 'sad', 'heartbreak', 'grief'] },

  // Party & Vibes & Gaming
  { id: 'confetti', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/512.webp', emoji: '🎉', title: 'Party Popper', category: 'gaming', tags: ['party', 'popper', 'celebrate', 'tada', 'congrats'] },
  { id: 'balloon', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f388/512.webp', emoji: '🎈', title: 'Red Balloon', category: 'gaming', tags: ['balloon', 'party', 'birthday', 'float'] },
  { id: 'dancing', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f483/512.webp', emoji: '💃', title: 'Flamenco Dancer', category: 'gaming', tags: ['dance', 'party', 'vibes', 'groove', 'fun'] },
  { id: 'dice', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f3b2/512.webp', emoji: '🎲', title: 'Game Dice', category: 'gaming', tags: ['dice', 'game', 'luck', 'roll', 'boardgame'] },
  { id: 'trophy', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f3c6/512.webp', emoji: '🏆', title: 'Champion Trophy', category: 'gaming', tags: ['trophy', 'win', 'champion', 'gold', 'first'] },
  { id: 'crown', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f451/512.webp', emoji: '👑', title: 'Royal Crown', category: 'gaming', tags: ['crown', 'king', 'queen', 'royal', 'gold'] },
  { id: 'alien', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f47d/512.webp', emoji: '👽', title: 'Cosmic Alien', category: 'gaming', tags: ['alien', 'ufo', 'space', 'extraterrestrial', 'sci-fi'] },
  { id: 'robot', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f916/512.webp', emoji: '🤖', title: 'Smart Bot', category: 'gaming', tags: ['robot', 'bot', 'ai', 'tech', 'future'] },
  { id: 'guitar', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f3b8/512.webp', emoji: '🎸', title: 'Rock Guitar', category: 'gaming', tags: ['guitar', 'music', 'rock', 'instrument', 'song'] },
  { id: 'pizza', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f355/512.webp', emoji: '🍕', title: 'Hot Pizza', category: 'gaming', tags: ['pizza', 'food', 'snack', 'cheese', 'yummy'] },
  { id: 'coffee', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2615/512.webp', emoji: '☕', title: 'Steaming Coffee', category: 'gaming', tags: ['coffee', 'tea', 'morning', 'energy', 'cafe'] },
  { id: 'gem', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f48e/512.webp', emoji: '💎', title: 'Diamond Gem', category: 'gaming', tags: ['diamond', 'gem', 'rich', 'shine', 'luxury'] },
  { id: 'money', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4b8/512.webp', emoji: '💸', title: 'Flying Cash', category: 'gaming', tags: ['money', 'cash', 'dollars', 'rich', 'payday'] },
  { id: 'bullseye', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f3af/512.webp', emoji: '🎯', title: 'Direct Target', category: 'gaming', tags: ['target', 'hit', 'bullseye', 'exact', 'accurate'] },

  // Exclusive Zovio Pro Animated Stickers (599 Plan)
  { id: 'pro_crown', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f451/512.webp', emoji: '👑', title: 'Royal Crown (Pro)', category: 'premium', proOnly: true, tags: ['pro', 'crown', 'king', 'queen', 'vip'] },
  { id: 'pro_unicorn', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f984/512.webp', emoji: '🦄', title: 'Mystic Unicorn (Pro)', category: 'premium', proOnly: true, tags: ['pro', 'unicorn', 'magic', 'legend'] },
  { id: 'pro_dragon', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f409/512.webp', emoji: '🐉', title: 'Emerald Dragon (Pro)', category: 'premium', proOnly: true, tags: ['pro', 'dragon', 'power', 'fire'] },
  { id: 'pro_crystal', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f52e/512.webp', emoji: '🔮', title: 'Crystal Orb (Pro)', category: 'premium', proOnly: true, tags: ['pro', 'crystal', 'magic', 'future'] },
  { id: 'pro_butterfly', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f98b/512.webp', emoji: '🦋', title: 'Prism Butterfly (Pro)', category: 'premium', proOnly: true, tags: ['pro', 'butterfly', 'glow', 'aesthetic'] },
  { id: 'pro_bolt', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/26a1/512.webp', emoji: '⚡', title: 'Supercharged (Pro)', category: 'premium', proOnly: true, tags: ['pro', 'bolt', 'lightning', 'fast', '60fps'] },
  { id: 'pro_planet', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1fa90/512.webp', emoji: '🪐', title: 'Saturn Orbit (Pro)', category: 'premium', proOnly: true, tags: ['pro', 'planet', 'space', 'cosmic'] },
  { id: 'pro_fireworks', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f386/512.webp', emoji: '🎆', title: 'Neon Fireworks (Pro)', category: 'premium', proOnly: true, tags: ['pro', 'fireworks', 'celebrate', 'night'] },
  { id: 'pro_comet', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2604/512.webp', emoji: '☄️', title: 'Blazing Comet (Pro)', category: 'premium', proOnly: true, tags: ['pro', 'comet', 'meteor', 'space'] },
  { id: 'pro_cherry', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f338/512.webp', emoji: '🌸', title: 'Sakura Bloom (Pro)', category: 'premium', proOnly: true, tags: ['pro', 'sakura', 'flower', 'pink'] },
  { id: 'pro_trophy', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f3c6/512.webp', emoji: '🏆', title: 'Grand Champion (Pro)', category: 'premium', proOnly: true, tags: ['pro', 'trophy', 'winner', 'gold'] },
  { id: 'pro_sparkles', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2728/512.webp', emoji: '✨', title: 'Golden Aura (Pro)', category: 'premium', proOnly: true, tags: ['pro', 'sparkles', 'glow', 'clean'] }
];

let activeSgTab = 'stickers'; // 'stickers' | 'gifs'
let activeSgCategory = 'all';
let sgSearchQuery = '';
let isCustomMode = false;

// GIPHY Live State
let giphyGifs = [];
let isGiphyLoading = false;
let giphyDebounceTimer = null;
let giphyFetchToken = 0;

async function fetchGiphy(query = '', category = 'all') {
  const currentToken = ++giphyFetchToken;
  isGiphyLoading = true;
  const bodyEl = $('#sgBody');
  if (bodyEl && activeSgTab === 'gifs') {
    renderGiphySkeletons(bodyEl);
  }

  try {
    let endpoint = '';
    const q = (query || '').trim();
    if (q) {
      endpoint = `/api/giphy/search?q=${encodeURIComponent(q)}&limit=36`;
    } else if (category && category !== 'all' && category !== 'trending') {
      endpoint = `/api/giphy/search?q=${encodeURIComponent(category)}&limit=36`;
    } else {
      endpoint = `/api/giphy/trending?limit=36`;
    }

    const res = await api(endpoint);
    if (currentToken !== giphyFetchToken) return; // Stale request discard
    giphyGifs = (res && Array.isArray(res.data)) ? res.data : [];
  } catch (err) {
    console.error('Failed to query GIPHY API:', err);
    if (currentToken === giphyFetchToken) {
      giphyGifs = [];
    }
  } finally {
    if (currentToken === giphyFetchToken) {
      isGiphyLoading = false;
      if (activeSgTab === 'gifs') {
        const b = $('#sgBody');
        if (b) renderSgItems(b);
      }
    }
  }
}

function renderGiphySkeletons(container) {
  container.innerHTML = `
    <div class="sg-grid gifs skeletons">
      ${Array.from({ length: 14 }).map(() => `
        <div class="sg-gif-skeleton"></div>
      `).join('')}
    </div>
  `;
}

let sgOutsideClickBound = false;
let sgCloseTimer = null;

let attachOutsideClickBound = false;

function closeAttachMenu() {
  const menu = $('#attachMenu');
  if (menu && !menu.classList.contains('hidden')) {
    menu.classList.add('hidden');
  }
}

function onAttachMenuOutsidePointerDown(e) {
  const menu = $('#attachMenu');
  if (!menu || menu.classList.contains('hidden')) return;
  if (menu.contains(e.target)) return;
  if (e.target.closest('#attachBtn')) return;
  closeAttachMenu();
}

function initAttachMenuListeners() {
  if (attachOutsideClickBound) return;
  attachOutsideClickBound = true;
  document.addEventListener('pointerdown', onAttachMenuOutsidePointerDown, true);
  document.addEventListener('click', onAttachMenuOutsidePointerDown, true);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAttachMenu();
  });
}

function onStickerDrawerOutsidePointerDown(e) {
  const drawer = $('#stickerGifDrawer');
  if (!drawer || drawer.classList.contains('hidden') || drawer.classList.contains('sg-closing')) return;
  if (drawer.contains(e.target)) return;
  if (e.target.closest('#stickerBtn, #gifBtn, [data-open-stickers]')) return;
  closeStickerGifDrawer();
}

function toggleStickerGifDrawer() {
  const drawer = $('#stickerGifDrawer');
  if (!drawer) return;
  const isHidden = drawer.classList.contains('hidden') || drawer.classList.contains('sg-closing');
  if (isHidden) {
    openStickerGifDrawer(activeSgTab);
  } else {
    closeStickerGifDrawer();
  }
}

function openStickerGifDrawer(tab = 'stickers') {
  const drawer = $('#stickerGifDrawer');
  if (!drawer) return;
  if (sgCloseTimer) {
    clearTimeout(sgCloseTimer);
    sgCloseTimer = null;
  }
  activeSgTab = tab;
  drawer.classList.remove('hidden', 'sg-closing');
  drawer.classList.add('sg-opening');
  renderStickerGifDrawer();
  if (tab === 'gifs' && !giphyGifs.length) {
    fetchGiphy(sgSearchQuery, activeSgCategory);
  }
  if (!sgOutsideClickBound) {
    sgOutsideClickBound = true;
    document.addEventListener('pointerdown', onStickerDrawerOutsidePointerDown, true);
  }
}

function closeStickerGifDrawer() {
  const drawer = $('#stickerGifDrawer');
  if (!drawer || drawer.classList.contains('hidden') || drawer.classList.contains('sg-closing')) return;
  drawer.classList.remove('sg-opening');
  drawer.classList.add('sg-closing');
  if (sgCloseTimer) clearTimeout(sgCloseTimer);
  sgCloseTimer = setTimeout(() => {
    drawer.classList.remove('sg-closing');
    drawer.classList.add('hidden');
    sgCloseTimer = null;
  }, 190);
}

function renderStickerGifDrawer() {
  const drawer = $('#stickerGifDrawer');
  if (!drawer) return;

  const stickerCats = [
    { id: 'all', label: '🌟 All (70+)' },
    { id: 'premium', label: '✨ Special Pack' },
    { id: 'fire', label: '🔥 Fire & Hype' },
    { id: 'reactions', label: '😂 Reactions' },
    { id: 'animals', label: '🐱 Cute Animals' },
    { id: 'love', label: '❤️ Love & Sweet' },
    { id: 'gaming', label: '🎉 Party & Fun' }
  ];

  const gifCats = [
    { id: 'all', label: '🔥 Trending' },
    { id: 'reactions', label: '😂 Reactions' },
    { id: 'memes', label: '🤣 Memes' },
    { id: 'dance', label: '💃 Dance' },
    { id: 'love', label: '💖 Love & Hugs' },
    { id: 'mind blown', label: '🤯 Mind Blown' },
    { id: 'popcorn', label: '🍿 Popcorn' },
    { id: 'applause', label: '👏 Applause' },
    { id: 'bye', label: '👋 Wave & Bye' },
    { id: 'party', label: '🎉 Celebrate' }
  ];

  const cats = activeSgTab === 'stickers' ? stickerCats : gifCats;
  const searchPlaceholder = activeSgTab === 'stickers'
    ? 'Search 60+ animated stickers...'
    : 'Search millions of GIFs on GIPHY...';

  drawer.innerHTML = `
    <div class="sg-drawer-content">
      <!-- Top Switcher & Controls Bar -->
      <div class="sg-top-bar">
        <div class="sg-switcher">
          <button type="button" class="sg-switch-btn ${activeSgTab === 'stickers' ? 'active' : ''}" data-sgtab="stickers">
            ${icon('sticker')} <span>Stickers</span>
          </button>
          <button type="button" class="sg-switch-btn ${activeSgTab === 'gifs' ? 'active' : ''}" data-sgtab="gifs">
            ${icon('gif')} <span>GIFs</span>
          </button>
        </div>

        <div class="sg-search-wrap">
          <span class="sg-search-ico">${icon('search')}</span>
          <input type="text" id="sgSearchInput" class="sg-search-input" placeholder="${esc(searchPlaceholder)}" value="${esc(sgSearchQuery)}">
          ${sgSearchQuery ? `<button type="button" class="sg-search-clear" id="sgClearSearchBtn" title="Clear search">✕</button>` : ''}
        </div>

        <div class="sg-actions">
          <button type="button" class="btn ghost sm sg-custom-btn ${isCustomMode ? 'active' : ''}" id="sgCustomToggleBtn" title="Custom Link or Upload">
            ${isCustomMode ? 'Library' : '+ Custom'}
          </button>
          <button type="button" class="icon-btn sm sg-close-btn" id="sgCloseBtn" title="Close Drawer">
            ${icon('close')}
          </button>
        </div>
      </div>

      <!-- Categories Bar (if not custom mode) -->
      ${!isCustomMode ? `
        <div class="sg-cats-bar" id="sgCatsBar">
          ${cats.map(c => `
            <button type="button" class="sg-cat-pill ${activeSgCategory === c.id ? 'active' : ''}" data-cat="${c.id}">
              ${c.label}
            </button>
          `).join('')}
        </div>
      ` : ''}

      <!-- Drawer Body -->
      <div class="sg-body" id="sgBody"></div>
    </div>`;

  hydrateIcons(drawer);

  const bodyEl = $('#sgBody', drawer);

  // Bind top bar events
  $$('.sg-switch-btn', drawer).forEach(b => {
    b.onclick = () => {
      activeSgTab = b.dataset.sgtab;
      activeSgCategory = 'all';
      sgSearchQuery = '';
      isCustomMode = false;
      renderStickerGifDrawer();
      if (activeSgTab === 'gifs') {
        fetchGiphy('', 'all');
      }
    };
  });

  $('#sgCustomToggleBtn', drawer).onclick = () => {
    isCustomMode = !isCustomMode;
    renderStickerGifDrawer();
  };

  $('#sgCloseBtn', drawer).onclick = closeStickerGifDrawer;

  const searchInp = $('#sgSearchInput', drawer);
  if (searchInp) {
    searchInp.oninput = () => {
      sgSearchQuery = searchInp.value.trim().toLowerCase();
      isCustomMode = false;
      if (activeSgTab === 'stickers') {
        renderSgItems(bodyEl);
      } else {
        clearTimeout(giphyDebounceTimer);
        giphyDebounceTimer = setTimeout(() => {
          fetchGiphy(sgSearchQuery, activeSgCategory);
        }, 280);
      }
    };
  }

  const clearBtn = $('#sgClearSearchBtn', drawer);
  if (clearBtn) {
    clearBtn.onclick = () => {
      sgSearchQuery = '';
      if (activeSgTab === 'stickers') {
        renderStickerGifDrawer();
      } else {
        renderStickerGifDrawer();
        fetchGiphy('', activeSgCategory);
      }
    };
  }

  $$('.sg-cat-pill', drawer).forEach(b => {
    b.onclick = () => {
      activeSgCategory = b.dataset.cat;
      $$('.sg-cat-pill', drawer).forEach(p => p.classList.toggle('active', p.dataset.cat === activeSgCategory));
      if (activeSgTab === 'stickers') {
        renderSgItems(bodyEl);
      } else {
        fetchGiphy(sgSearchQuery, activeSgCategory);
      }
    };
  });

  if (isCustomMode) {
    renderCustomPanel(bodyEl);
  } else {
    if (activeSgTab === 'gifs' && !giphyGifs.length && !isGiphyLoading) {
      fetchGiphy(sgSearchQuery, activeSgCategory);
    } else {
      renderSgItems(bodyEl);
    }
  }
}

function renderSgItems(container) {
  if (activeSgTab === 'stickers') {
    let items = CURATED_STICKERS;
    if (activeSgCategory !== 'all') {
      items = items.filter(s => s.category === activeSgCategory);
    }
    if (sgSearchQuery) {
      items = items.filter(s => s.title.toLowerCase().includes(sgSearchQuery) || s.tags.some(t => t.includes(sgSearchQuery)) || s.emoji.includes(sgSearchQuery));
    }

    if (!items.length) {
      container.innerHTML = `
        <div class="sg-empty">
          <div class="sg-empty-ico">🔍</div>
          <div class="sg-empty-title">No stickers found for "<b>${esc(sgSearchQuery)}</b>"</div>
          <p class="muted xs">Try searching for fire, joy, cat, love, party, or skull</p>
          <button type="button" class="btn ghost sm" id="sgTryCustomBtn" style="margin-top:10px">+ Send Custom Sticker URL</button>
        </div>`;
      $('#sgTryCustomBtn', container)?.addEventListener('click', () => {
        isCustomMode = true;
        renderStickerGifDrawer();
      });
      return;
    }

    container.innerHTML = `
      <div class="sg-grid stickers">
        ${items.map(s => {
          const staticUrl = s.url.replace('/512.webp', '/512.png');
          return `
            <button type="button" class="sg-item sticker-item" data-sid="${s.id}" data-anim="${s.url}" data-static="${staticUrl}" title="${esc(s.title)}" style="position:relative">
              <img src="${staticUrl}" alt="${esc(s.title)}" loading="lazy" onerror="this.closest('.sticker-item')?.remove()">
            </button>
          `;
        }).join('')}
      </div>`;

    $$('.sg-item.sticker-item', container).forEach(b => {
      const img = b.querySelector('img');
      const animUrl = b.dataset.anim;
      const staticUrl = b.dataset.static;
      b.addEventListener('mouseenter', () => {
        if (img && animUrl) img.src = animUrl;
      });
      b.addEventListener('mouseleave', () => {
        if (img && staticUrl) img.src = staticUrl;
      });
      b.onclick = () => {
        const item = CURATED_STICKERS.find(s => s.id === b.dataset.sid);
        if (!item) return;
        sendSticker(item);
      };
    });
  } else {
    // Live GIPHY GIFs
    if (isGiphyLoading) {
      renderGiphySkeletons(container);
      return;
    }

    if (!giphyGifs.length) {
      container.innerHTML = `
        <div class="sg-empty">
          <div class="sg-empty-ico">🎬</div>
          <div class="sg-empty-title">No GIFs found ${sgSearchQuery ? `for "<b>${esc(sgSearchQuery)}</b>"` : ''}</div>
          <p class="muted xs">Search by emotion, reaction, movie or trending terms on GIPHY</p>
          <button type="button" class="btn ghost sm" id="sgTryCustomBtn" style="margin-top:10px">+ Paste Custom GIF URL</button>
        </div>`;
      $('#sgTryCustomBtn', container)?.addEventListener('click', () => {
        isCustomMode = true;
        renderStickerGifDrawer();
      });
      return;
    }

    container.innerHTML = `
      <div class="sg-grid gifs">
        ${giphyGifs.map(g => `
          <button type="button" class="sg-item gif-item" data-gid="${g.id}" title="${esc(g.title)}">
            <img src="${g.preview || g.url}" alt="${esc(g.title)}" loading="lazy">
            <div class="sg-gif-overlay">
              <span class="sg-gif-tag">GIF</span>
            </div>
          </button>
        `).join('')}
      </div>
      <div class="sg-giphy-footer">
        <span class="sg-giphy-badge">Powered by <strong>GIPHY</strong></span>
      </div>`;

    $$('.sg-item.gif-item', container).forEach(b => {
      b.onclick = () => {
        const item = giphyGifs.find(g => g.id === b.dataset.gid);
        if (item) sendGif(item);
      };
    });
  }
}

function renderCustomPanel(container) {
  const isSticker = activeSgTab === 'stickers';
  container.innerHTML = `
    <div class="sg-custom-panel">
      <div class="sg-custom-head">
        <strong>Send Custom ${isSticker ? 'Sticker' : 'Animated GIF'}</strong>
        <p class="muted xs" style="margin:4px 0 0">
          Paste any image or GIF URL from the web, or pick a file from your device.
        </p>
      </div>

      <div class="row gap-s align-center" style="margin-top:10px">
        <input type="url" id="sgCustomUrlInput" class="input sm" placeholder="https://example.com/image.gif or .webp" style="flex:1">
        <button type="button" class="btn primary sm" id="sgCustomSendBtn" disabled>Send</button>
      </div>

      <div id="sgCustomPreviewWrap" class="sg-custom-preview-wrap hidden">
        <img id="sgCustomPreviewImg" alt="Custom Preview">
        <span class="sg-custom-preview-tag">${isSticker ? 'Sticker' : 'GIF'}</span>
      </div>

      <div class="row gap-s align-center between" style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border)">
        <button type="button" class="btn ghost sm" id="sgDeviceUploadBtn">
          ${icon('upload')} <span>Upload from Device</span>
        </button>
        <span class="muted xs">Supports .gif, .webp, .png, .jpg</span>
        <input type="file" id="sgFileInput" accept="image/gif,image/webp,image/png,image/jpeg" class="hidden">
      </div>
    </div>`;

  hydrateIcons(container);

  const urlInp = $('#sgCustomUrlInput', container);
  const sendBtn = $('#sgCustomSendBtn', container);
  const prevWrap = $('#sgCustomPreviewWrap', container);
  const prevImg = $('#sgCustomPreviewImg', container);
  const uploadBtn = $('#sgDeviceUploadBtn', container);
  const fileInp = $('#sgFileInput', container);

  let currentCustomUrl = '';

  urlInp.oninput = () => {
    const val = urlInp.value.trim();
    if (val && /^https?:\/\//i.test(val)) {
      currentCustomUrl = val;
      prevImg.src = val;
      prevWrap.classList.remove('hidden');
      sendBtn.disabled = false;
    } else {
      currentCustomUrl = '';
      prevWrap.classList.add('hidden');
      sendBtn.disabled = true;
    }
  };

  sendBtn.onclick = () => {
    if (!currentCustomUrl) return;
    if (isSticker) {
      sendSticker({ url: currentCustomUrl, emoji: '⭐', title: 'Custom Sticker' });
    } else {
      sendGif({ url: currentCustomUrl, title: 'Custom GIF' });
    }
  };

  uploadBtn.onclick = () => fileInp.click();

  fileInp.onchange = async () => {
    const file = fileInp.files[0];
    if (!file) return;
    fileInp.value = '';
    if (file.size > 180 * 1024) {
      const c = S.chats.get(S.activeChatId);
      if (!c) return;
      try {
        const chunkSize = S.config.chunkSize || 1536 * 1024;
        const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));
        const fileKeyRaw = E2E.newKeyRaw();
        const fileKey = await E2E.importKey(fileKeyRaw);
        const { id: fileId } = await api('/api/files', {
          method: 'POST',
          body: { chatId: c.id, size: file.size, chunks: totalChunks, viewOnce: false }
        });
        for (let n = 0; n < totalChunks; n++) {
          const slice = file.slice(n * chunkSize, Math.min(file.size, (n + 1) * chunkSize));
          const plainBytes = new Uint8Array(await slice.arrayBuffer());
          const sealed = await E2E.encryptChunk(fileKey, plainBytes);
          await uploadChunkWithProgress(`/api/files/${fileId}/${n}`, sealed);
        }
        await api(`/api/files/${fileId}/complete`, { method: 'POST' });
        const mime = file.type || (isSticker ? 'image/webp' : 'image/gif');
        if (window.ZovioLocalDB) {
          ZovioLocalDB.putMedia(fileId, {
            uid: S.user?.id,
            chatId: c.id,
            mime,
            name: file.name || (isSticker ? 'Custom Sticker' : 'Custom GIF'),
            size: file.size,
            blob: file
          }).catch(() => {});
        }
        const mediaMeta = {
          fileId,
          fileKey: fileKeyRaw,
          mime,
          size: file.size,
          chunks: totalChunks,
          title: file.name || (isSticker ? 'Custom Sticker' : 'Custom GIF')
        };
        if (isSticker) {
          await sendSticker({ ...mediaMeta, emoji: '⭐' });
        } else {
          await sendGif(mediaMeta);
        }
        return;
      } catch (err) {
        toast(`Failed to upload ${isSticker ? 'sticker' : 'GIF'}: ` + (err?.message || 'Error'), 'err');
        return;
      }
    }
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target.result;
      if (isSticker) {
        sendSticker({ url: dataUrl, emoji: '⭐', title: file.name });
      } else {
        sendGif({ url: dataUrl, title: file.name });
      }
    };
    reader.readAsDataURL(file);
  };
}

let _sendingDrawerMedia = false;

async function _sendDrawerMedia(type, item, basePayload, defaultMime, errLabel) {
  const c = S.chats.get(S.activeChatId);
  if (!c || _sendingDrawerMedia) return;
  _sendingDrawerMedia = true;
  closeStickerGifDrawer();
  try {
    const payload = { ...basePayload };
    if (item.fileId) {
      payload.fileId = item.fileId;
      payload.fileKey = item.fileKey;
      payload.mime = item.mime || defaultMime;
      payload.size = item.size || 0;
      payload.chunks = item.chunks || 1;
    }
    await sendChatPayload(type, payload, item.fileId ? { fileIds: [item.fileId] } : {});
  } catch (err) {
    toast(`Failed to send ${errLabel}: ` + err.message, 'err');
  } finally {
    _sendingDrawerMedia = false;
  }
}

async function sendSticker(sticker) {
  return _sendDrawerMedia(
    'sticker',
    sticker,
    {
      url: sticker.url || '',
      emoji: sticker.emoji || '⭐',
      title: sticker.title || 'Sticker'
    },
    'image/webp',
    'sticker'
  );
}

async function sendGif(gif, caption = '') {
  const basePayload = {
    url: gif.url || '',
    title: gif.title || 'GIF',
    caption: caption || ''
  };
  if (gif.id) basePayload.giphyId = gif.id;
  if (gif.fallbackUrl) basePayload.fallbackUrl = gif.fallbackUrl;
  return _sendDrawerMedia('gif', gif, basePayload, 'image/gif', 'GIF');
}

function renderConvoShell() {
  const c = S.chats.get(S.activeChatId);
  if (!c) return;
  const d = chatDisplay(c);
  const peer = d.peer;
  const isFriend = peer ? isUserFriend(peer.id) : false;
  const isBlocked = peer ? isUserBlocked(peer.id) : false;
  const isUnacceptedRequest = c.type === 'dm' && peer && c.isAccepted === false && !isFriend && c.ownerId !== S.user.id;
  const isUnacceptedGroup = c.type === 'group' && c.isAccepted === false && c.ownerId !== S.user.id;

  const isChanAdmin = c.ownerId === S.user.id || (c.admins || []).includes(S.user.id) || c.isAdmin;
  const canPost = !isBlocked && !isUnacceptedRequest && !isUnacceptedGroup && (
    c.type === 'channel'
      ? isChanAdmin
      : !(c.type === 'group' && c.settings?.onlyAdmins && !c.admins?.includes(S.user.id) && c.ownerId !== S.user.id)
  );

  const showFriendStatusBar = c.type === 'dm' && peer && !isBlocked && !isUnacceptedRequest && !isFriend;

  let bottomAreaHTML = '';
  if (isBlocked && peer) {
    bottomAreaHTML = `
      <div class="msg-request-banner blocked-mode">
        <div class="col gap-xs" style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:13.5px;color:#ff6b81"><span class="ico" style="vertical-align:middle">${icon('ban')}</span> You blocked ${esc(peer.name)} (@${esc(peer.username)})</div>
          <small class="muted">Blocked users cannot message you or see your FireStatus. Unblock them anytime to resume chatting.</small>
        </div>
        <div class="row gap-xs wrap">
          <button type="button" class="btn primary sm" id="unblockInChatBtn">${icon('shieldCheck')} <span>Unblock</span></button>
          <button type="button" class="btn danger sm" id="deleteBlockedChatBtn">${icon('trash')} <span>Delete Chat</span></button>
        </div>
      </div>`;
  } else if (isUnacceptedRequest && peer) {
    bottomAreaHTML = `
      <div class="msg-request-banner">
        <div class="col gap-xs" style="flex:1;min-width:0">
          <div class="row gap-xs" style="align-items:center">
            <span class="pill amber">${icon('userPlus')} Message Request</span>
            <strong style="font-size:14px">${esc(peer.name)} (@${esc(peer.username)}) wants to chat with you</strong>
          </div>
          <small class="muted">Click <b>Continue with Chat</b> to reply. Your <b>FireStatus</b> stays hidden from them until you click <b>Mark as Friend</b>.</small>
        </div>
        <div class="row gap-xs wrap">
          <button type="button" class="btn primary sm" id="acceptChatReqBtn">${icon('check')} <span>Continue with Chat</span></button>
          <button type="button" class="btn sm friend-pill-btn" id="acceptAndFriendBtn">${icon('userCheck')} <span>Mark as Friend</span></button>
          <button type="button" class="btn danger sm" id="blockReqBtn">${icon('ban')} <span>Block</span></button>
          <button type="button" class="btn ghost sm" id="deleteReqBtn">${icon('trash')} <span>Delete</span></button>
        </div>
      </div>`;
  } else if (isUnacceptedGroup) {
    bottomAreaHTML = `
      <div class="msg-request-banner group-request-mode">
        <div class="col gap-xs" style="flex:1;min-width:0">
          <div class="row gap-xs" style="align-items:center">
            <span class="pill amber">${icon('users')} Group Invitation</span>
            <strong style="font-size:14px">You were added to “${esc(c.name)}”</strong>
          </div>
          <small class="muted">You can continue to chat, leave, or block this group so you cannot be added again.</small>
        </div>
        <div class="row gap-xs wrap">
          <button type="button" class="btn primary sm" id="acceptGroupBtn">${icon('check')} <span>Continue to Chat</span></button>
          <button type="button" class="btn ghost sm" id="leaveGroupBtn">${icon('logOut')} <span>Leave Group</span></button>
          <button type="button" class="btn danger sm" id="blockGroupBtn">${icon('ban')} <span>Block Group</span></button>
        </div>
      </div>`;
  } else if (canPost) {
    bottomAreaHTML = `
      <div id="composerFormatBar" class="composer-format-bar hidden" aria-label="Text Formatting">
        <button type="button" class="fmt-btn" data-fmt="bold" title="Bold (*text*)"><strong>B</strong></button>
        <button type="button" class="fmt-btn" data-fmt="italic" title="Italic (_text_)"><em>I</em></button>
        <button type="button" class="fmt-btn" data-fmt="strike" title="Strikethrough (~text~)"><del>S</del></button>
        <button type="button" class="fmt-btn" data-fmt="code" title="Monospace (\`code\`)"><code>&lt;/&gt;</code></button>
        <button type="button" class="fmt-btn" data-fmt="bullet" title="Bullet List (- item)">• List</button>
      </div>
      <div class="composer">
        <button class="icon-btn" id="attachBtn" title="Attach">${icon('plus')}</button>
        <button class="icon-btn" id="stickerGifBtn" title="Stickers & GIFs">${icon('sticker')}</button>
        <textarea id="msgInput" rows="1" enterkeyhint="send" inputmode="text" autocomplete="on" autocorrect="on" autocapitalize="sentences" spellcheck="true" placeholder="${c.type === 'channel' ? 'Broadcast to followers…' : 'Write a message…'}"></textarea>
        <button class="icon-btn" id="voiceBtn" title="Record voice note">${icon('mic')}</button>
        <button class="btn primary sm" id="sendBtn">${icon('send')}</button>
      </div>`;
  } else {
    bottomAreaHTML = `
      <div class="row between" style="padding:6px 4px">
        <span class="muted">${c.type === 'channel' ? 'Public ZovioCast — react with 1 emoji on posts below.' : 'Only admins can send messages in this group.'}</span>
        ${c.type === 'channel' ? `<button class="btn ${c.isFollowing ? 'ghost' : 'primary'} sm" id="followToggleBtn">${c.isFollowing ? 'Following' : 'Follow ZovioCast'}</button>` : ''}
      </div>`;
  }

  const existingScroll = $('#msgsScroll');
  const savedScrollTop = existingScroll ? existingScroll.scrollTop : null;

  if (existingScroll && $('#composerWrap') && $('#convoHead')) {
    // Structure already exists: update bottom composer area and header WITHOUT wiping msgsScroll or interrupting scroll position
    $('#composerWrap').innerHTML = `
      <div id="stickerGifDrawer" class="sticker-gif-drawer hidden"></div>
      <div id="replyBar" class="reply-bar hidden"></div>
      <div id="uploadBar" class="upload-bar hidden"></div>
      <div id="voiceRecBar" class="voice-rec-bar hidden"></div>
      <div id="attachMenu" class="attach-menu hidden">
        <button class="attach-item" data-act="stickers"><span class="ico-dot" style="background:#f59e0b">${icon('sticker')}</span><div><div>Stickers &amp; GIFs</div><small class="muted">Send animated stickers &amp; GIFs</small></div></button>
        <button class="attach-item" data-act="media"><span class="ico-dot" style="background:#10b981"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></span><div><div>Photos &amp; Videos</div><small class="muted">Multiple images &amp; clips (album collage)</small></div></button>
        <button class="attach-item" data-act="camera"><span class="ico-dot" style="background:#ff5c8a">${icon('camera')}</span><div><div>Live Camera</div><small class="muted">Snap photo or video</small></div></button>
        <button class="attach-item" data-act="file"><span class="ico-dot" style="background:#7c5cff">${icon('file')}</span><div><div>Document / Large File</div><small class="muted">Up to 2 GB · E2EE</small></div></button>
        <button class="attach-item" data-act="viewonce"><span class="ico-dot" style="background:#ff9f43">${icon('eye')}</span><div><div>One-View Media</div><small class="muted">Photo or Video</small></div></button>
        <button class="attach-item" data-act="location"><span class="ico-dot" style="background:#2ed3b7">${icon('pin')}</span><div><div>Live Location</div><small class="muted">Pin or real-time</small></div></button>
        <button class="attach-item" data-act="poll"><span class="ico-dot" style="background:#4c8dff">${icon('poll')}</span><div><div>Poll / Vote</div><small class="muted">Single or multi</small></div></button>
        <button class="attach-item" data-act="todo"><span class="ico-dot" style="background:#a55eea">${icon('check')}</span><div><div>Shared To-Do</div><small class="muted">Tick together</small></div></button>
      </div>
      ${bottomAreaHTML}
    `;
    renderConvoHead();
    bindConvoActions(c, peer, canPost);
    if (savedScrollTop != null && existingScroll) {
      existingScroll.scrollTop = savedScrollTop;
    }
    return;
  }

  $('#convo').innerHTML = `
    <header class="convo-head" id="convoHead"></header>
    <div id="chatSearchBar" class="chat-search-bar hidden">
      <span class="search-bar-ico">${icon('search')}</span>
      <input id="chatSearchInput" placeholder="Search in this chat…" autocomplete="off">
      <span id="chatSearchCount" class="search-bar-count"></span>
      <button type="button" class="icon-btn sm" id="searchPrevMatch" title="Previous match">▲</button>
      <button type="button" class="icon-btn sm" id="searchNextMatch" title="Next match">▼</button>
      <button type="button" class="icon-btn sm" id="closeChatSearch" title="Close search">${icon('close')}</button>
    </div>
    <div id="pinnedBannerSlot"></div>
    <div class="msgs" id="msgsScroll"><div class="msgs-inner" id="msgsInner"></div></div>
    <button type="button" class="scroll-bottom-btn hidden" id="scrollBottomBtn" title="Scroll to recent messages">
      ${icon('chevronDown')}
      <span class="scroll-bottom-badge hidden" id="scrollBottomBadge">0</span>
    </button>
    <div class="composer-wrap" id="composerWrap">
      <div id="stickerGifDrawer" class="sticker-gif-drawer hidden"></div>
      <div id="replyBar" class="reply-bar hidden"></div>
      <div id="uploadBar" class="upload-bar hidden"></div>
      <div id="voiceRecBar" class="voice-rec-bar hidden"></div>
      <div id="attachMenu" class="attach-menu hidden">
        <button class="attach-item" data-act="stickers"><span class="ico-dot" style="background:#f59e0b">${icon('sticker')}</span><div><div>Stickers &amp; GIFs</div><small class="muted">Send animated stickers &amp; GIFs</small></div></button>
        <button class="attach-item" data-act="media"><span class="ico-dot" style="background:#10b981"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></span><div><div>Photos &amp; Videos</div><small class="muted">Multiple images &amp; clips (album collage)</small></div></button>
        <button class="attach-item" data-act="camera"><span class="ico-dot" style="background:#ff5c8a">${icon('camera')}</span><div><div>Live Camera</div><small class="muted">Snap photo or video</small></div></button>
        <button class="attach-item" data-act="file"><span class="ico-dot" style="background:#7c5cff">${icon('file')}</span><div><div>Document / Large File</div><small class="muted">Up to 2 GB · E2EE</small></div></button>
        <button class="attach-item" data-act="viewonce"><span class="ico-dot" style="background:#ff9f43">${icon('eye')}</span><div><div>One-View Media</div><small class="muted">Photo or Video</small></div></button>
        <button class="attach-item" data-act="location"><span class="ico-dot" style="background:#2ed3b7">${icon('pin')}</span><div><div>Live Location</div><small class="muted">Pin or real-time</small></div></button>
        <button class="attach-item" data-act="poll"><span class="ico-dot" style="background:#4c8dff">${icon('poll')}</span><div><div>Poll / Vote</div><small class="muted">Single or multi</small></div></button>
        <button class="attach-item" data-act="todo"><span class="ico-dot" style="background:#a55eea">${icon('check')}</span><div><div>Shared To-Do</div><small class="muted">Tick together</small></div></button>
      </div>
      ${bottomAreaHTML}
    </div>`;

  renderConvoHead();
  setupChatSearch();

  // Scroll to bottom button detection, user scroll lock & auto-bottom ResizeObserver
  const sc = $('#msgsScroll');
  const innerEl = $('#msgsInner');
  const scrollDownBtn = $('#scrollBottomBtn');
  if (sc && scrollDownBtn) {
    let lastScrollTop = sc.scrollTop;
    sc._userTouching = false;
    sc.onscroll = () => {
      const curTop = sc.scrollTop;
      const distFromBottom = sc.scrollHeight - curTop - sc.clientHeight;
      const scrolledUp = curTop < lastScrollTop - 2;
      const scrolledDown = curTop > lastScrollTop + 2;
      if (scrolledUp) {
        S._stickToBottomUntil = 0;
        S.userScrolledUp = true;
      }
      lastScrollTop = curTop;

      if (distFromBottom > 120) {
        if (!S._stickToBottomUntil || Date.now() > S._stickToBottomUntil) {
          S.userScrolledUp = true;
        }
        scrollDownBtn.classList.remove('hidden');
      } else {
        if (!scrolledUp && (scrolledDown || distFromBottom <= 6) && distFromBottom <= 20) {
          S.userScrolledUp = false;
        }
        if (distFromBottom <= 24) {
          scrollDownBtn.classList.add('hidden');
          const badge = $('#scrollBottomBadge');
          if (badge) {
            badge.classList.add('hidden');
            badge.textContent = '0';
          }
        } else if (S.userScrolledUp) {
          scrollDownBtn.classList.remove('hidden');
        }
      }
    };
    // Detect wheel, scrollbar drag, or touch gesture immediately so ResizeObserver never fights the user
    sc.onwheel = (e) => {
      if (e.deltaY < 0) {
        S._stickToBottomUntil = 0;
        S.userScrolledUp = true;
      }
    };
    sc.onpointerdown = () => {
      S._stickToBottomUntil = 0;
      sc._userTouching = true;
    };
    sc.onpointerup = () => { sc._userTouching = false; };
    sc.onpointercancel = () => { sc._userTouching = false; };
    sc.ontouchstart = () => {
      S._stickToBottomUntil = 0;
      sc._userTouching = true;
    };
    sc.ontouchend = () => { sc._userTouching = false; };
    sc.ontouchcancel = () => { sc._userTouching = false; };
    scrollDownBtn.onclick = () => {
      S.userScrolledUp = false;
      sc.scrollTo({ top: sc.scrollHeight, behavior: 'smooth' });
      SoundFX?.play?.('click');
    };
  }
  if (sc && innerEl && typeof ResizeObserver !== 'undefined') {
    if (sc._resizeObs) sc._resizeObs.disconnect();
    sc._resizeObs = new ResizeObserver(() => {
      const distFromBottom = sc.scrollHeight - sc.scrollTop - sc.clientHeight;
      if (!S.userScrolledUp && !sc._userTouching && (distFromBottom <= 28 || (S._stickToBottomUntil && Date.now() < S._stickToBottomUntil))) {
        sc.scrollTop = sc.scrollHeight;
      }
    });
    sc._resizeObs.observe(innerEl);
  }

  bindConvoActions(c, peer, canPost);
  setupDragAndDrop();
}

function bindConvoActions(c, peer, canPost) {
  if ($('#unblockInChatBtn')) {
    $('#unblockInChatBtn').onclick = () => peer && toggleBlockUser(peer.id, false);
  }
  if ($('#deleteBlockedChatBtn')) {
    $('#deleteBlockedChatBtn').onclick = () => deleteOrLeaveChat(c.id);
  }
  if ($('#acceptChatReqBtn')) {
    $('#acceptChatReqBtn').onclick = () => acceptChatRequest(c.id);
  }
  if ($('#acceptAndFriendBtn')) {
    $('#acceptAndFriendBtn').onclick = async () => {
      await acceptChatRequest(c.id);
      if (peer) await toggleMarkFriend(peer.id);
    };
  }
  if ($('#blockReqBtn')) {
    $('#blockReqBtn').onclick = () => peer && toggleBlockUser(peer.id, true);
  }
  if ($('#deleteReqBtn')) {
    $('#deleteReqBtn').onclick = () => deleteOrLeaveChat(c.id);
  }
  if ($('#acceptGroupBtn')) {
    $('#acceptGroupBtn').onclick = async () => {
      const res = await api(`/api/chats/${c.id}/accept`, { method: 'POST' });
      const chatObj = res.chat || res;
      c.isAccepted = true;
      c.acceptedBy = [...new Set([...(c.acceptedBy || []), S.user?.id])];
      if (chatObj && chatObj.id) {
        S.chats.set(c.id, { ...c, ...chatObj, isAccepted: true });
      }
      toast('Joined group chat');
      renderChatList();
      openChat(c.id);
    };
  }
  if ($('#leaveGroupBtn')) {
    $('#leaveGroupBtn').onclick = () => removeGroupMember(c, S.user.id);
  }
  if ($('#blockGroupBtn')) {
    $('#blockGroupBtn').onclick = async () => {
      if (!confirm(`Are you sure you want to block "${c.name}"? You will leave and cannot be added back.`)) return;
      await api(`/api/chats/${c.id}/block-group`, { method: 'POST' });
      S.chats.delete(c.id);
      S.activeChatId = null;
      $('#convo').classList.add('hidden');
      $('#chatEmpty').classList.remove('hidden');
      toast('Group blocked');
      renderChatList();
    };
  }

  if (canPost) {
    const inp = $('#msgInput');
    const fmtBar = $('#composerFormatBar');
    let lastType = 0;

    const resizeInput = () => {
      if (!inp) return;
      inp.style.height = 'auto';
      const nextH = Math.min(inp.scrollHeight, 120);
      inp.style.height = nextH + 'px';
      inp.style.overflowY = inp.scrollHeight > 120 ? 'auto' : 'hidden';
    };

    const applyComposerFormat = fmt => {
      if (!inp) return;
      const start = inp.selectionStart ?? inp.value.length;
      const end = inp.selectionEnd ?? inp.value.length;
      const val = inp.value;
      const selected = val.slice(start, end);

      if (fmt === 'bullet') {
        const lineStart = val.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
        const prefixMatch = val.slice(lineStart).match(/^(\s*(?:[-*•]|\d+\.)\s+)/);
        if (prefixMatch) {
          inp.value = val.slice(0, lineStart) + val.slice(lineStart + prefixMatch[1].length);
          const nextPos = Math.max(lineStart, start - prefixMatch[1].length);
          try { inp.setSelectionRange(nextPos, nextPos); } catch {}
        } else {
          inp.value = val.slice(0, lineStart) + '- ' + val.slice(lineStart);
          const nextPos = start + 2;
          try { inp.setSelectionRange(nextPos, nextPos); } catch {}
        }
      } else {
        const wrap = fmt === 'bold' ? '*' : fmt === 'italic' ? '_' : fmt === 'strike' ? '~' : '`';
        if (selected) {
          inp.value = val.slice(0, start) + wrap + selected + wrap + val.slice(end);
          try { inp.setSelectionRange(start + 1, end + 1); } catch {}
        } else {
          inp.value = val.slice(0, start) + wrap + wrap + val.slice(end);
          try { inp.setSelectionRange(start + 1, start + 1); } catch {}
        }
      }
      inp.focus();
      resizeInput();
      fmtBar?.classList.remove('hidden');
    };

    if (fmtBar) {
      fmtBar.onmousedown = e => e.preventDefault();
      $$('.fmt-btn', fmtBar).forEach(btn => {
        btn.onclick = () => applyComposerFormat(btn.dataset.fmt);
      });
    }

    if (inp) {
      inp.oninput = () => {
        resizeInput();
        if (!S.userScrolledUp) {
          scrollToBottom(true);
        }
        const hasVal = inp.value.trim().length > 0;
        if (!hasVal && lastType > 0 && S.ws?.readyState === 1) {
          lastType = 0;
          S.ws.send(JSON.stringify({ type: 'typing', chatId: c.id, on: false }));
        } else if (hasVal && Date.now() - lastType > 1800 && S.ws?.readyState === 1) {
          lastType = Date.now();
          S.ws.send(JSON.stringify({ type: 'typing', chatId: c.id, on: true }));
        }
      };
      inp.onpaste = e => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
          if (item.kind === 'file' && (item.type.startsWith('image/') || item.type.startsWith('video/') || item.type.startsWith('audio/'))) {
            const f = item.getAsFile();
            if (f) {
              e.preventDefault();
              uploadEncryptedFile(f);
              return;
            }
          }
        }
      };
      inp.onfocus = () => {
        fmtBar?.classList.remove('hidden');
        if (c.unread) {
          c.unread = 0;
          renderChatList();
        }
      };
      inp.onblur = () => {
        setTimeout(() => {
          if (document.activeElement !== inp && !inp.value.trim()) {
            fmtBar?.classList.add('hidden');
          }
        }, 120);
      };
      inp.onkeydown = e => {
        if ((e.ctrlKey || e.metaKey) && !e.altKey) {
          const k = e.key.toLowerCase();
          if (k === 'b') {
            e.preventDefault();
            applyComposerFormat('bold');
            return;
          }
          if (k === 'i') {
            e.preventDefault();
            applyComposerFormat('italic');
            return;
          }
          if (k === 'enter') {
            e.preventDefault();
            sendTextMessage();
            return;
          }
        }

        const enterToSend = (S.user?.preferences?.enterToSend !== false) && (S.user?.prefs?.enterToSend !== false);
        if (e.key === 'Enter' && !e.shiftKey) {
          const pos = inp.selectionStart ?? inp.value.length;
          const endPos = inp.selectionEnd ?? pos;
          const val = inp.value;
          const lineStart = val.lastIndexOf('\n', Math.max(0, pos - 1)) + 1;
          const lineBeforeCursor = val.slice(lineStart, pos);
          const bulletMatch = lineBeforeCursor.match(/^(\s*)([-*•])\s+(.*)$/);
          const numMatch = lineBeforeCursor.match(/^(\s*)(\d+)\.\s+(.*)$/);

          if (bulletMatch || numMatch) {
            e.preventDefault();
            if (bulletMatch) {
              const [, indent, marker, body] = bulletMatch;
              if (!body.trim()) {
                inp.value = val.slice(0, lineStart) + val.slice(endPos);
                try { inp.setSelectionRange(lineStart, lineStart); } catch {}
              } else {
                const insert = `\n${indent}${marker} `;
                inp.value = val.slice(0, pos) + insert + val.slice(endPos);
                const nextPos = pos + insert.length;
                try { inp.setSelectionRange(nextPos, nextPos); } catch {}
              }
            } else {
              const [, indent, numStr, body] = numMatch;
              if (!body.trim()) {
                inp.value = val.slice(0, lineStart) + val.slice(endPos);
                try { inp.setSelectionRange(lineStart, lineStart); } catch {}
              } else {
                const insert = `\n${indent}${Number(numStr) + 1}. `;
                inp.value = val.slice(0, pos) + insert + val.slice(endPos);
                const nextPos = pos + insert.length;
                try { inp.setSelectionRange(nextPos, nextPos); } catch {}
              }
            }
            resizeInput();
            return;
          }

          if (enterToSend) {
            e.preventDefault();
            sendTextMessage();
          }
        }
      };
    }
    if ($('#sendBtn')) {
      const keepComposerFocus = (e) => {
        if (typeof window._stopAndSendVoiceNote !== 'function' && document.activeElement === $('#msgInput')) {
          e.preventDefault();
        }
      };
      $('#sendBtn').onpointerdown = keepComposerFocus;
      $('#sendBtn').onmousedown = keepComposerFocus;
      $('#sendBtn').onclick = () => {
        if (typeof window._stopAndSendVoiceNote === 'function') {
          window._stopAndSendVoiceNote();
          return;
        }
        sendTextMessage();
        fmtBar?.classList.add('hidden');
      };
    }
    if ($('#stickerGifBtn')) $('#stickerGifBtn').onclick = toggleStickerGifDrawer;
    initAttachMenuListeners();
    if ($('#attachBtn')) {
      $('#attachBtn').onclick = e => {
        e.stopPropagation();
        const menu = $('#attachMenu');
        if (!menu) return;
        if (menu.classList.contains('hidden')) {
          closeStickerGifDrawer();
          menu.classList.remove('hidden');
        } else {
          menu.classList.add('hidden');
        }
      };
    }
    $$('#attachMenu .attach-item').forEach(b => b.onclick = () => {
      closeAttachMenu();
      handleAttachAction(b.dataset.act);
    });
    if ($('#voiceBtn')) bindVoiceRecorder($('#voiceBtn'));
  } else if ($('#followToggleBtn')) {
    $('#followToggleBtn').onclick = () => toggleFollowChannel(c);
  }
  setupDragAndDrop();
}

// ---------------- WhatsApp Audio & Video Calling Engine ----------------
let activeCallSession = null; // { mode: 'audio'|'video', chatId, code, callId, isCaller, timeoutTimer }

async function startChatCall(c, mode) {
  if (!c || (c.type !== 'dm' && c.type !== 'group')) return;
  if (typeof activeRoom !== 'undefined' && activeRoom) {
    return toast('You are already participating in an active meeting/call', 'err');
  }
  if (activeCallSession) {
    return toast('A call is already in progress', 'err');
  }

  const d = chatDisplay(c);
  const peer = d.peer;

  if (c.type === 'dm') {
    if (!peer) return toast('Cannot initiate call with this contact', 'err');
    if (isUserBlocked(peer.id)) {
      return toast('Unblock ' + peer.name + ' before placing a call', 'err');
    }
    const peerFull = S.users.get(peer.id) || peer;
    const isFriend = isUserFriend(peer.id);
    if (peerFull?.privacy?.callsFromFriendsOnly && !isFriend) {
      return toast(`${peer.name} only accepts calls from friends. Mark them as Friend first.`, 'err');
    }
  }

  const callCode = `call-${c.id.slice(0, 4)}-${Math.random().toString(36).slice(2, 6)}`;
  const callTitle = c.type === 'group'
    ? `${c.name || 'Group'} ${mode === 'video' ? 'Video' : 'Voice'} Call`
    : `${S.user.name} & ${peer?.name || 'Contact'} (${mode === 'video' ? 'Video' : 'Voice'})`;

  const memberIds = (c.members || []).map(m => typeof m === 'object' && m ? m.id : m).filter(Boolean);
  const invitees = memberIds.filter(id => id !== S.user?.id);

  let m = null;
  try {
    m = await api('/api/meetings', {
      method: 'POST',
      body: {
        code: callCode,
        title: callTitle,
        chatId: c.id,
        invitees,
        mode
      }
    });
  } catch (err) {
    return toast('Failed to initiate call: ' + err.message, 'err');
  }

  const resolvedPeer = peer || (c.type === 'dm'
    ? (c.members || []).map(m => typeof m === 'object' && m ? m : S.users.get(m)).find(u => u && u.id !== S.user?.id)
    : { name: c.name || 'Group', avatar: c.avatar || '' });

  activeCallSession = {
    mode,
    chatId: c.id,
    chatType: c.type,
    code: m.code,
    callId: m.id,
    isCaller: true,
    peer: resolvedPeer
  };

  // Broadcast call invitation to other members
  S.ws?.send(JSON.stringify({
    type: 'call:start',
    chatId: c.id,
    callId: m.id,
    code: m.code,
    mode: mode,
    title: callTitle
  }));

  if (c.type === 'group') {
    // In group, caller enters call room directly while members receive ringing / join prompt
    toast(`Started Group ${mode === 'video' ? 'Video' : 'Voice'} Call`);
    enterMeetingRoom(m, { initialVideo: mode === 'video', initialAudio: true });
    activeCallSession = null;
    return;
  }

  // Show WhatsApp Outgoing Calling screen
  showOutgoingCallModal(c, peer, mode, m.code);
}

function showOutgoingCallModal(c, peer, mode, code) {
  closeCallOverlay();
  SoundFX?.startRingtone?.('outgoing');

  const root = $('#callOverlayRoot');
  if (!root) return;

  const peerId = typeof peer === 'object' && peer ? (peer.id || peer.userId) : peer;
  let peerObj = (peerId ? S.users.get(peerId) : null) || (typeof peer === 'object' && peer ? peer : null);
  if (!peerObj || !peerObj.avatar) {
    const memberObj = (c?.members || []).find(m => typeof m === 'object' && m && m.id === peerId);
    if (memberObj) peerObj = { ...(peerObj || {}), ...memberObj };
  }
  if (!peerObj) peerObj = { id: peerId, name: 'Contact', avatarColor: '#7c5cff' };

  root.innerHTML = `
    <div id="callOverlay" class="call-overlay">
      <div class="call-overlay-card outgoing">
        <div class="call-avatar-wrap">
          ${avatarHTML(peerObj, 'xl')}
          <div class="call-wave-rings"><span></span><span></span><span></span></div>
        </div>
        <h2 class="call-peer-name">${esc(peerObj.name || 'Contact')}</h2>
        <div class="call-status-badge" id="callStatusBadge">Calling...</div>
        <div class="call-mode-pill">
          ${mode === 'video' ? icon('video') : icon('phone')}
          <span>${mode === 'video' ? 'Video' : 'Voice'} Call</span>
        </div>
        <div class="call-e2e-badge">${icon('lock')} End-to-End Encrypted</div>
        <div class="call-actions-row">
          <button type="button" class="call-btn-circle hangup" id="cancelOutgoingCallBtn" title="End Call">
            ${icon('phoneOff')}
            <span>End</span>
          </button>
        </div>
      </div>
    </div>`;

  hydrateIcons(root);

  // Proactively fetch full profile if avatar or name is missing
  if (peerId && (!peerObj.avatar || !peerObj.name || peerObj.name === 'Contact')) {
    api('/api/users/lookup', { method: 'POST', body: { ids: [peerId] } }).then(list => {
      if (list && list[0]) {
        const fullPeer = list[0];
        S.users.set(fullPeer.id, fullPeer);
        const avaWrap = root.querySelector('.call-avatar-wrap');
        if (avaWrap) avaWrap.innerHTML = `${avatarHTML(fullPeer, 'xl')}<div class="call-wave-rings"><span></span><span></span><span></span></div>`;
        const nameEl = root.querySelector('.call-peer-name');
        if (nameEl && fullPeer.name) nameEl.textContent = fullPeer.name;
      }
    }).catch(() => {});
  }

  // Calling... switches to Ringing... only when recipient acknowledges arrival (handleCallRinging)

  // 40 second unanswered timeout
  if (activeCallSession) {
    activeCallSession.timeoutTimer = setTimeout(() => {
      endOutgoingCall('No answer');
    }, 40000);
  }

  $('#cancelOutgoingCallBtn', root).onclick = () => {
    endOutgoingCall('Call cancelled');
  };
}

function endOutgoingCall(reason = '') {
  SoundFX?.stopRingtone?.();
  if (activeCallSession) {
    if (activeCallSession.timeoutTimer) clearTimeout(activeCallSession.timeoutTimer);
    S.ws?.send(JSON.stringify({
      type: 'call:end',
      chatId: activeCallSession.chatId,
      code: activeCallSession.code,
      callId: activeCallSession.callId
    }));
  }
  const badge = $('#callStatusBadge');
  if (badge && reason) {
    badge.textContent = reason;
    badge.style.color = '#ef4444';
  }
  setTimeout(() => {
    closeCallOverlay();
    activeCallSession = null;
  }, 1000);
}

function showIncomingCallModal(msg) {
  closeCallOverlay();
  SoundFX?.startRingtone?.('incoming');

  const root = $('#callOverlayRoot');
  if (!root) return;

  activeCallSession = {
    mode: msg.mode || 'audio',
    chatId: msg.chatId,
    chatType: msg.chatType,
    code: msg.code,
    callId: msg.callId,
    isCaller: false
  };

  const callerFromStore = msg.callerId ? S.users.get(msg.callerId) : null;
  const callerObj = callerFromStore || {
    id: msg.callerId,
    name: msg.callerName || 'Caller',
    username: msg.callerUsername || '',
    avatar: msg.callerAvatar || null,
    avatarColor: msg.callerAvatarColor || '#7c5cff'
  };

  root.innerHTML = `
    <div id="callOverlay" class="call-overlay">
      <div class="call-overlay-card incoming">
        <div class="call-avatar-wrap">
          ${avatarHTML(callerObj, 'xl')}
          <div class="call-wave-rings incoming"><span></span><span></span><span></span></div>
        </div>
        <h2 class="call-peer-name">${esc(callerObj.name)}</h2>
        <div class="call-status-badge incoming">
          Incoming ${msg.mode === 'video' ? 'Video' : 'Voice'} Call
        </div>
        ${msg.chatType === 'group' ? `<div class="call-group-name">in ${esc(msg.chatTitle)}</div>` : ''}
        <div class="call-mode-pill">
          ${msg.mode === 'video' ? icon('video') : icon('phone')}
          <span>${msg.mode === 'video' ? 'Video' : 'Voice'} Call</span>
        </div>
        <div class="call-e2e-badge">${icon('lock')} End-to-End Encrypted</div>
        <div class="call-actions-row between">
          <button type="button" class="call-btn-circle hangup" id="declineCallBtn" title="Decline Call">
            ${icon('phoneOff')}
            <span>Decline</span>
          </button>
          <button type="button" class="call-btn-circle accept" id="acceptCallBtn" title="Accept Call">
            ${msg.mode === 'video' ? icon('video') : icon('phone')}
            <span>Accept</span>
          </button>
        </div>
      </div>
    </div>`;

  hydrateIcons(root);

  // Proactively fetch full profile if avatar or name is missing
  if (msg.callerId && (!callerObj.avatar || !callerObj.name || callerObj.name === 'Caller')) {
    api('/api/users/lookup', { method: 'POST', body: { ids: [msg.callerId] } }).then(list => {
      if (list && list[0]) {
        const full = list[0];
        S.users.set(full.id, full);
        const wrap = root.querySelector('.call-avatar-wrap');
        if (wrap) wrap.innerHTML = `${avatarHTML(full, 'xl')}<div class="call-wave-rings incoming"><span></span><span></span><span></span></div>`;
        const nameEl = root.querySelector('.call-peer-name');
        if (nameEl && full.name) nameEl.textContent = full.name;
      }
    }).catch(() => {});
  }

  $('#declineCallBtn', root).onclick = () => {
    SoundFX?.stopRingtone?.();
    window.ZovioAndroid?.cancelNotification?.(`call-${msg.callId || msg.code || 'incoming'}`);
    window.ZovioAndroid?.cancelNotification?.('call-incoming');
    closeCallOverlay();
    S.ws?.send(JSON.stringify({
      type: 'call:response',
      chatId: msg.chatId,
      code: msg.code,
      callId: msg.callId,
      response: 'decline'
    }));
    activeCallSession = null;
  };

  $('#acceptCallBtn', root).onclick = async () => {
    SoundFX?.stopRingtone?.();
    window.ZovioAndroid?.cancelNotification?.(`call-${msg.callId || msg.code || 'incoming'}`);
    window.ZovioAndroid?.cancelNotification?.('call-incoming');
    closeCallOverlay();
    S.ws?.send(JSON.stringify({
      type: 'call:response',
      chatId: msg.chatId,
      code: msg.code,
      callId: msg.callId,
      response: 'accept'
    }));

    // Launch call in WebRTC room
    try {
      let m = (S.meetings || []).find(x => x.code === msg.code);
      if (!m) {
        m = await api(`/api/meetings/code/${msg.code}`).catch(() => null);
      }
      if (!m) {
        m = { code: msg.code, title: msg.chatTitle || `${msg.callerName}'s Call` };
      }
      enterMeetingRoom(m, {
        initialVideo: msg.mode === 'video',
        initialAudio: true
      });
    } catch (e) {
      toast('Failed to connect to call: ' + e.message, 'err');
    }
    activeCallSession = null;
  };
}

function handleIncomingCall(msg) {
  // Acknowledge call delivery back to caller (switches caller UI from "Calling..." -> "Ringing...")
  S.ws?.send(JSON.stringify({
    type: 'call:ringing',
    chatId: msg.chatId,
    code: msg.code,
    callId: msg.callId,
    callerId: msg.callerId
  }));
  // If user is already in another meeting or call
  if (typeof activeRoom !== 'undefined' && activeRoom) {
    S.ws?.send(JSON.stringify({
      type: 'call:response',
      chatId: msg.chatId,
      code: msg.code,
      callId: msg.callId,
      response: 'busy'
    }));
    return;
  }
  if ((document.hidden || !document.hasFocus()) && typeof window.showDesktopNotification === 'function') {
    const caller = S.users.get(msg.callerId) || msg.caller || {};
    window.showDesktopNotification(caller.name || msg.callerName || 'Incoming Call', {
      category: 'call',
      chatId: msg.chatId,
      tag: `call-${msg.callId || msg.code}`,
      body: msg.mode === 'video' ? 'Incoming video call' : 'Incoming voice call'
    });
  }
  showIncomingCallModal(msg);
}

window.handleCallRinging = msg => {
  if (!activeCallSession) return;
  if (msg?.callId && activeCallSession.callId && msg.callId !== activeCallSession.callId) return;
  if (msg?.code && activeCallSession.code && msg.code !== activeCallSession.code) return;
  const badge = $('#callStatusBadge');
  if (badge) {
    badge.textContent = 'Ringing...';
    badge.classList.add('ringing');
  }
};

function handleCallAccepted(msg) {
  SoundFX?.stopRingtone?.();
  if (!activeCallSession) return;
  if (activeCallSession.timeoutTimer) clearTimeout(activeCallSession.timeoutTimer);

  const badge = $('#callStatusBadge');
  if (badge) {
    badge.textContent = 'Connecting...';
    badge.style.color = '#10b981';
  }

  const callMode = activeCallSession.mode;
  const callCode = activeCallSession.code;

  setTimeout(async () => {
    closeCallOverlay();
    try {
      let m = await api(`/api/meetings/code/${callCode}`).catch(() => null);
      if (!m) m = { code: callCode, title: `${S.user.name}'s Call` };
      enterMeetingRoom(m, {
        initialVideo: callMode === 'video',
        initialAudio: true
      });
    } catch (err) {
      toast('Connection error: ' + err.message, 'err');
    }
    activeCallSession = null;
  }, 400);
}

function handleCallDeclined(msg) {
  SoundFX?.stopRingtone?.();
  if (activeCallSession?.timeoutTimer) clearTimeout(activeCallSession.timeoutTimer);
  const badge = $('#callStatusBadge');
  if (badge) {
    badge.textContent = msg.reason === 'busy' ? 'User is busy on another call' : 'Call Declined';
    badge.style.color = '#ef4444';
  }
  setTimeout(() => {
    closeCallOverlay();
    activeCallSession = null;
  }, 1600);
}

function handleCallEnded(msg) {
  SoundFX?.stopRingtone?.();
  if (activeCallSession && activeCallSession.code === msg.code) {
    closeCallOverlay();
    activeCallSession = null;
    toast('Call ended');
  }
  if (typeof activeRoom !== 'undefined' && activeRoom && (activeRoom.code === msg.code || !msg.code)) {
    SoundFX?.play('leave');
    toast('Call ended by other participant');
    if (typeof leaveMeetingRoom === 'function') leaveMeetingRoom();
  }
}

function handleCallAnsweredElsewhere(msg) {
  SoundFX?.stopRingtone?.();
  if (activeCallSession && (!msg?.code || activeCallSession.code === msg.code || activeCallSession.callId === msg.callId)) {
    if (activeCallSession.timeoutTimer) clearTimeout(activeCallSession.timeoutTimer);
    closeCallOverlay();
    activeCallSession = null;
  } else if ($('#callOverlayRoot')?.innerHTML.trim()) {
    closeCallOverlay();
  }
}

function handleCallError(msg) {
  SoundFX?.stopRingtone?.();
  closeCallOverlay();
  activeCallSession = null;
  toast(msg.error || 'Call could not be completed', 'err');
}

function closeCallOverlay() {
  const root = $('#callOverlayRoot');
  if (root) root.innerHTML = '';
}

async function directCallUser(peerId, mode = 'audio') {
  if (!peerId) return toast('Invalid contact', 'err');
  if (peerId === S.user?.id) return toast('You cannot call yourself', 'err');

  let peer = S.users.get(peerId);
  if (!peer) {
    try {
      const fetched = await api('/api/users/lookup', { method: 'POST', body: { ids: [peerId] } });
      if (fetched && fetched[0]) {
        peer = fetched[0];
        S.users.set(peer.id, peer);
      }
    } catch {}
  }

  // Find existing DM chat
  let targetChat = Array.from(S.chats.values()).find(c => {
    if (c.type !== 'dm') return false;
    return (c.members || []).some(m => {
      const mid = typeof m === 'object' && m ? m.id : m;
      return mid === peerId;
    });
  });

  if (!targetChat) {
    // Create new DM chat
    try {
      if (!peer) {
        return toast('User details could not be found', 'err');
      }
      const { keys } = await wrapNewChatKey([S.user, peer]);
      targetChat = await api('/api/chats/dm', {
        method: 'POST',
        body: { targetUserId: peerId, keys }
      });
      S.chats.set(targetChat.id, targetChat);
    } catch (err) {
      return toast('Could not start call: ' + err.message, 'err');
    }
  }

  if (targetChat) {
    switchView('chats');
    S.showCalls = false;
    $('#headCallsBtn')?.classList.remove('active');
    $('#chatCallsPane')?.classList.add('hidden');
    await openChat(targetChat.id);
    startChatCall(targetChat, mode);
  }
}

async function openStartCallModal() {
  const users = Array.from(S.users.values()).filter(u => u && u.id && u.id !== S.user?.id);

  const renderContactList = (filterText = '') => {
    const q = filterText.toLowerCase().trim().replace(/^@+/, '');
    const filtered = users.filter(u => {
      if (!q) return true;
      const uname = (u.username || '').toLowerCase().replace(/^@+/, '');
      return (u.name || '').toLowerCase().includes(q) || uname.includes(q);
    });

    if (!filtered.length) {
      return `<div class="empty-state" style="padding:28px 16px;text-align:center"><div class="muted">No contacts match "${esc(filterText)}"</div></div>`;
    }

    return filtered.map(u => `
      <div class="chat-row call-contact-row" style="padding:10px 14px;border-radius:12px;margin-bottom:6px;display:flex;align-items:center;gap:12px;background:var(--bg-2)">
        ${avatarHTML(u, 'sm')}
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:14px;color:var(--text-0)">${esc(u.name || 'User')}</div>
          <div class="muted" style="font-size:12px">@${esc(u.username || '')}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-shrink:0">
          <button type="button" class="btn primary sm call-start-btn icon-only-call-btn" data-peer-id="${esc(u.id)}" data-mode="audio" title="Voice Call" aria-label="Voice Call">
            ${icon('phone')}
          </button>
          <button type="button" class="btn sm call-start-btn icon-only-call-btn video" data-peer-id="${esc(u.id)}" data-mode="video" title="Video Call" aria-label="Video Call">
            ${icon('video')}
          </button>
        </div>
      </div>
    `).join('');
  };

  const bodyHTML = `
    <div class="search" style="margin-bottom:10px">
      <i data-icon="search"></i>
      <input type="text" id="startCallSearchInput" placeholder="Search contacts by name or @username..." style="width:100%">
    </div>
    <div id="startCallContactsList" style="max-height:340px;overflow-y:auto;display:flex;flex-direction:column;padding-right:2px">
      ${renderContactList()}
    </div>
  `;

  showModal('📞 Call Contacts', bodyHTML, root => {
    const searchInput = $('#startCallSearchInput', root);
    const contactsContainer = $('#startCallContactsList', root);

    const wireCallButtons = () => {
      $$('.call-start-btn', contactsContainer).forEach(btn => {
        btn.onclick = () => {
          const peerId = btn.dataset.peerId;
          const mode = btn.dataset.mode || 'audio';
          closeModal();
          directCallUser(peerId, mode);
        };
      });
    };

    wireCallButtons();

    searchInput?.addEventListener('input', () => {
      contactsContainer.innerHTML = renderContactList(searchInput.value);
      hydrateIcons(contactsContainer);
      wireCallButtons();
    });

    setTimeout(() => searchInput?.focus(), 60);
  });
}

window.directCallUser = directCallUser;
window.openStartCallModal = openStartCallModal;

// Expose call handlers globally for WebSocket dispatcher in core.js
window.handleIncomingCall = handleIncomingCall;
window.handleCallAccepted = handleCallAccepted;
window.handleCallDeclined = handleCallDeclined;
window.handleCallEnded = handleCallEnded;
window.handleCallAnsweredElsewhere = handleCallAnsweredElsewhere;
window.handleCallError = handleCallError;
window.startChatCall = startChatCall;

function renderConvoHead() {
  const c = S.chats.get(S.activeChatId);
  const head = $('#convoHead');
  if (!c || !head) return;
  const d = chatDisplay(c);
  const peer = d.peer;
  const isMuted = isChatMuted(c.id);
  const isChanAdmin = c.type === 'channel' && (c.ownerId === S.user.id || (c.admins || []).includes(S.user.id) || c.isAdmin);
  const isGroupAdmin = c.type === 'group' && (c.ownerId === S.user.id || (c.admins || []).includes(S.user.id) || c.isAdmin);
  const showAdminBadge = isChanAdmin || isGroupAdmin;
  const isFriend = peer && Array.isArray(S.user?.friends) && S.user.friends.includes(peer.id);
  const friendBadge = (c.type === 'dm' && peer)
    ? (isFriend
        ? `<span class="pill xs green" style="font-size:11px;font-weight:700">Friend</span>`
        : `<span class="pill xs" style="font-size:11px;font-weight:600;opacity:0.75">Not Friend</span>`)
    : '';

  // WhatsApp-like Calling for ONLY chats and groups (not channels, not saved messages)
  const canCall = c.type === 'dm' || c.type === 'group';

  head.innerHTML = `
    <button class="icon-btn" id="backListBtn" title="Back">${icon('back')}</button>
    ${avatarHTML(d.ava)}
    <div class="col" style="min-width:0;flex:1;cursor:pointer" id="headInfoTrigger">
      <div class="convo-title">
        <span class="convo-title-text">${esc(d.title)}</span>
        ${friendBadge}
        ${showAdminBadge ? `<span class="pill amber" style="font-size:11px;font-weight:700">Admin</span>` : ''}
        ${isMuted ? `<span class="pill" style="font-size:11px">🔇 Muted</span>` : ''}
      </div>
      <div class="convo-sub" id="convoSub">${esc(d.sub)}</div>
    </div>
    ${canCall ? `
      <button class="icon-btn call-head-btn" id="headVideoCallBtn" title="Video call">${icon('video')}</button>
      <button class="icon-btn call-head-btn" id="headAudioCallBtn" title="Voice call">${icon('phone')}</button>
    ` : ''}
    <button class="icon-btn" id="headSearchBtn" title="Search in chat">${icon('search')}</button>
    ${c.type === 'channel' ? `<button class="btn ${c.isFollowing ? 'ghost' : 'primary'} sm" id="headFollowBtn">${c.isFollowing ? 'Following ✓' : 'Follow'}</button>` : ''}
    <button class="icon-btn ${S.infoOpen ? 'active' : ''}" id="infoBtn" title="Chat Info & Controls">${icon('info')}</button>`;

  $('#backListBtn').onclick = () => {
    if (typeof window.closeMobileChatView === 'function') {
      window.closeMobileChatView();
    } else {
      $('#view-chats')?.classList.remove('convo-open');
    }
  };
  $('#headSearchBtn').onclick = openChatSearch;
  if ($('#headVideoCallBtn')) $('#headVideoCallBtn').onclick = () => startChatCall(c, 'video');
  if ($('#headAudioCallBtn')) $('#headAudioCallBtn').onclick = () => startChatCall(c, 'audio');
  $('#infoBtn').onclick = $('#headInfoTrigger').onclick = () => {
    setInfoPaneVisibility(!S.infoOpen);
  };
  if ($('#headFollowBtn')) $('#headFollowBtn').onclick = () => toggleFollowChannel(c);
}

let typingTimer = null;
function resetTypingSub() {
  clearTimeout(typingTimer);
  typingTimer = null;
  const sub = $('#convoSub');
  const cur = S.chats.get(S.activeChatId);
  if (sub && cur) {
    const disp = chatDisplay(cur);
    sub.textContent = disp.sub || '';
  }
}
function onTypingEvent({ chatId, name, on }) {
  if (chatId !== S.activeChatId) return;
  const sub = $('#convoSub');
  if (!sub) return;
  clearTimeout(typingTimer);
  if (on) {
    sub.innerHTML = `<span class="typing-indicator-live"><span>typing</span><span class="typing-dots-loader" aria-hidden="true"><i></i><i></i><i></i></span></span>`;
    typingTimer = setTimeout(resetTypingSub, 2600);
  } else {
    resetTypingSub();
  }
}

// ---------------- Render Messages ----------------
function renderPinnedBanner(c) {
  const slot = $('#pinnedBannerSlot');
  if (!slot) return;
  if (!c || !c.pinnedMessageId) {
    slot.innerHTML = '';
    return;
  }
  const list = S.msgs.get(c.id) || [];
  const pm = list.find(m => m.id === c.pinnedMessageId);
  if (!pm) {
    slot.innerHTML = '';
    return;
  }
  const preview = msgPreviewText(pm) || 'Pinned media or attachment';
  const amAdmin = c.type === 'dm' || c.type === 'self' || c.ownerId === S.user.id || (c.admins || []).includes(S.user.id) || c.isAdmin;
  slot.innerHTML = `
    <div class="pinned-banner">
      <div class="pinned-banner-content" data-jump="${pm.id}" title="Click to jump to message">
        <span class="pinned-icon">${icon('pinThumbtack')}</span>
        <div class="pinned-text"><b>Pinned:</b> ${esc(preview.slice(0, 85))}</div>
      </div>
      ${amAdmin ? `<button class="pinned-unpin-btn" data-unpin="${pm.id}" title="Unpin message">${icon('close')}</button>` : ''}
    </div>
  `;
  const jumpEl = $('[data-jump]', slot);
  if (jumpEl) {
    jumpEl.onclick = () => {
      const el = $(`#m-${pm.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('highlight-pulse');
        setTimeout(() => el.classList.remove('highlight-pulse'), 1800);
      }
    };
  }
  const unpinBtn = $('[data-unpin]', slot);
  if (unpinBtn) {
    unpinBtn.onclick = () => togglePinMessage(pm.id);
  }
}

async function togglePinMessage(mid) {
  try {
    const res = await api(`/api/messages/${mid}/pin`, { method: 'POST' });
    const c = S.chats.get(S.activeChatId);
    if (c) {
      c.pinnedMessageId = res.pinnedMessageId;
      renderPinnedBanner(c);
      renderMessages('preserve');
    }
  } catch (err) {
    toast(err.message, 'err');
  }
}

async function toggleStarMessage(mid) {
  try {
    const res = await api(`/api/messages/${mid}/star`, { method: 'POST' });
    const list = S.msgs.get(S.activeChatId) || [];
    const m = list.find(x => x.id === mid);
    if (m) {
      const listStars = m.starredBy || [];
      m.starredBy = res.starred ? [...listStars, S.user.id] : listStars.filter(u => u !== S.user.id);
      renderMessages('preserve');
      updateInfoPaneCounters(S.activeChatId);
    }
  } catch (err) {
    toast(err.message, 'err');
  }
}

async function translateMessage(mid, targetLang = 'en') {
  const list = S.msgs.get(S.activeChatId) || [];
  const m = list.find(x => x.id === mid);
  if (!m) return;
  const p = m._plain || m.body || {};
  const text = (p && typeof p === 'object' ? (p.text || p.caption) : p) || m.body?.text || m.body?.caption || '';
  if (!text) return toast('This message has no text to translate', 'err');

  try {
    toast(`Translating to ${targetLang.toUpperCase()}…`);
    const res = await api(`/api/messages/${mid}/translate`, {
      method: 'POST',
      body: { text, targetLang }
    });
    m._translatedText = res.translatedText;
    m._targetLang = res.targetLang || targetLang;
    m._showTranslation = true;
    renderMessages('preserve');
  } catch (err) {
    toast(err.message, 'err');
  }
}

function startEditMessage(m) {
  if (!m) return;
  const fifteenMinutes = 15 * 60 * 1000;
  if (Date.now() - m.ts > fifteenMinutes) {
    return toast('Messages can only be edited within 15 minutes of sending', 'err');
  }
  const p = m._plain || m.body || {};
  const text = p.text || (typeof p === 'string' ? p : '') || '';
  S.editingMsg = m;

  let editBar = $('#editMsgBar');
  if (!editBar) {
    editBar = document.createElement('div');
    editBar.id = 'editMsgBar';
    editBar.className = 'edit-msg-bar';
    const comp = $('#composerWrap');
    if (comp) comp.prepend(editBar);
  }
  editBar.classList.remove('hidden');
  editBar.innerHTML = `
    <div class="row between align-center" style="width:100%;padding:7px 14px;background:rgba(124,92,255,0.18);border-bottom:1px solid rgba(124,92,255,0.35);border-radius:10px 10px 0 0">
      <div class="row gap-xs align-center" style="font-size:12px;font-weight:700;color:var(--brand)">
        ${icon('edit')} <span>Editing message</span>
        <span class="muted xs" style="font-weight:400">· Press Enter or click Send to save</span>
      </div>
      <button type="button" class="icon-btn xs" id="cancelEditMsgBtn" style="width:22px;height:22px;font-size:12px" title="Cancel edit">✕</button>
    </div>
  `;
  hydrateIcons(editBar);
  $('#cancelEditMsgBtn', editBar).onclick = cancelEditMessage;

  const inp = $('#msgInput');
  if (inp) {
    inp.value = text;
    inp.focus();
    inp.setSelectionRange(text.length, text.length);
  }
}

function cancelEditMessage() {
  S.editingMsg = null;
  const editBar = $('#editMsgBar');
  if (editBar) editBar.classList.add('hidden');
  const inp = $('#msgInput');
  if (inp) inp.value = '';
}

async function deleteMessageForMe(mid) {
  try {
    await api(`/api/messages/${mid}/delete-for-me`, { method: 'POST' });
    const list = S.msgs.get(S.activeChatId) || [];
    S.msgs.set(S.activeChatId, list.filter(x => x.id !== mid));
    renderMessages('preserve');
    updateInfoPaneCounters(S.activeChatId);
  } catch (err) {
    toast(err.message, 'err');
  }
}

async function deleteMessageForEveryone(mid) {
  try {
    await api(`/api/messages/${mid}/delete-for-everyone`, { method: 'POST' });
    const list = S.msgs.get(S.activeChatId) || [];
    const m = list.find(x => x.id === mid);
    if (m) {
      m.deleted = true;
      m.deletedForEveryone = true;
      renderMessages('preserve');
      updateInfoPaneCounters(S.activeChatId);
    }
  } catch (err) {
    toast(err.message, 'err');
  }
}

function openDeleteMenu(btn, mid) {
  $$('.msg-del-menu').forEach(m => m.remove());

  const c = S.chats.get(S.activeChatId);
  const list = S.msgs.get(S.activeChatId) || [];
  const m = list.find(x => x.id === mid);
  if (!m) return;

  const out = m.senderId === S.user.id;
  const amAdmin = c.type !== 'dm' && (c.ownerId === S.user.id || (c.admins || []).includes(S.user.id) || c.isAdmin);
  const canDeleteEveryone = out || amAdmin;

  const menu = document.createElement('div');
  menu.className = 'msg-del-menu';
  menu.innerHTML = `
    <button class="msg-del-item" data-action="forme">
      ${icon('trash')} <span>Delete for me</span>
    </button>
    ${canDeleteEveryone ? `
      <button class="msg-del-item danger" data-action="everyone">
        ${icon('trash')} <span>Delete for everyone</span>
      </button>
    ` : ''}
  `;

  const cleanup = (e) => {
    if (!menu.contains(e.target) && e.target !== btn) {
      menu.remove();
      document.removeEventListener('click', cleanup);
    }
  };
  setTimeout(() => document.addEventListener('click', cleanup), 10);

  $('[data-action="forme"]', menu).onclick = () => {
    menu.remove();
    deleteMessageForMe(mid);
  };
  if ($('[data-action="everyone"]', menu)) {
    $('[data-action="everyone"]', menu).onclick = () => {
      menu.remove();
      deleteMessageForEveryone(mid);
    };
  }

  btn.parentElement.appendChild(menu);
}

// ---------------- Message Context Menu (Right Click) ----------------
function openMessageContextMenu(anchorEl, mid, ev) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  $$('.msg-ctx-menu, .chat-ctx-menu, .msg-del-menu').forEach(el => el.remove());

  const c = S.chats.get(S.activeChatId);
  const list = S.msgs.get(S.activeChatId) || [];
  const m = list.find(x => x.id === mid);
  if (!m || m.deleted) return;

  const isStarred = (m.starredBy || []).includes(S.user?.id);
  const isPinned = c && c.pinnedMessageId === m.id;
  const p = m._plain || m.body || {};
  const hasText = Boolean((p && p.text) || (typeof p === 'string' && p.length));
  const out = m.senderId === S.user?.id;
  const canEdit = out && !m.deleted && (Date.now() - m.ts <= 15 * 60 * 1000) && (m.kind === 'text' || (!m.kind && hasText));
  const editMinsLeft = Math.max(1, Math.ceil((15 * 60 * 1000 - (Date.now() - m.ts)) / 60000));
  const amAdmin = c && c.type !== 'dm' && (c.ownerId === S.user?.id || (c.admins || []).includes(S.user?.id) || c.isAdmin);
  const canDeleteEveryone = out || amAdmin;

  const menu = document.createElement('div');
  menu.className = 'msg-ctx-menu';
  menu.innerHTML = `
    <button type="button" class="msg-ctx-item" data-act="reply">
      ${icon('reply')} <span>Reply</span>
    </button>
    <button type="button" class="msg-ctx-item" data-act="forward">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg>
      <span>Forward</span>
    </button>
    <button type="button" class="msg-ctx-item" data-act="select">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
      <span>Select Messages</span>
    </button>
    <button type="button" class="msg-ctx-item" data-act="star">
      ${isStarred ? icon('starFill') : icon('star')} <span>${isStarred ? 'Unstar Message' : 'Star Message'}</span>
    </button>
    <button type="button" class="msg-ctx-item" data-act="pin">
      ${isPinned ? icon('unpin') : icon('pinThumbtack')} <span>${isPinned ? 'Unpin from Chat' : 'Pin to Chat'}</span>
    </button>
    ${hasText ? `
      <button type="button" class="msg-ctx-item" data-act="copy">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        <span>Copy Text</span>
      </button>
      ${canEdit ? `
        <button type="button" class="msg-ctx-item" data-act="edit">
          ${icon('edit')} <span>Edit message</span>
        </button>
      ` : ''}
      <button type="button" class="msg-ctx-item" data-act="translate">
        ${icon('globe')} <span>Translate</span>
      </button>
    ` : ''}
    <div class="msg-ctx-sep"></div>
    <button type="button" class="msg-ctx-item" data-act="del-me">
      ${icon('trash')} <span>Delete for me</span>
    </button>
    ${canDeleteEveryone ? `
      <button type="button" class="msg-ctx-item danger" data-act="del-everyone">
        ${icon('trash')} <span>Delete for everyone</span>
      </button>
    ` : ''}
  `;

  document.body.appendChild(menu);

  const mRect = menu.getBoundingClientRect();
  const menuH = Math.max(mRect.height, 380);
  const menuW = Math.max(mRect.width, 210);
  let left = ev ? ev.clientX : 120;
  let top = ev ? ev.clientY : 120;

  // If clicked near the bottom of the viewport, flip the menu upwards so it never goes off-screen or into the Windows taskbar
  if (top + menuH > window.innerHeight - 24) {
    top = Math.max(16, top - menuH);
  }

  // Horizontal clamping within window boundaries
  if (left + menuW > window.innerWidth - 16) {
    left = window.innerWidth - menuW - 16;
  }
  left = Math.max(16, left);
  top = Math.max(16, Math.min(top, window.innerHeight - menuH - 16));

  menu.style.top = `${top}px`;
  menu.style.left = `${left}px`;

  const cleanup = e => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', cleanup);
      document.removeEventListener('contextmenu', cleanup);
    }
  };
  setTimeout(() => {
    document.addEventListener('click', cleanup);
    document.addEventListener('contextmenu', cleanup);
  }, 10);

  $('[data-act="reply"]', menu).onclick = () => { menu.remove(); setReplyTo(mid); };
  $('[data-act="forward"]', menu).onclick = () => { menu.remove(); openForwardModal(m); };
  if ($('[data-act="select"]', menu)) {
    $('[data-act="select"]', menu).onclick = () => { menu.remove(); startMessageSelection(mid); };
  }
  $('[data-act="star"]', menu).onclick = () => { menu.remove(); toggleStarMessage(mid); };
  $('[data-act="pin"]', menu).onclick = () => { menu.remove(); togglePinMessage(mid); };
  if ($('[data-act="copy"]', menu)) {
    $('[data-act="copy"]', menu).onclick = () => {
      menu.remove();
      const txt = p.text || '';
      navigator.clipboard?.writeText(txt).catch(() => {});
    };
  }
  if ($('[data-act="edit"]', menu)) {
    $('[data-act="edit"]', menu).onclick = () => {
      menu.remove();
      startEditMessage(m);
    };
  }
  if ($('[data-act="translate"]', menu)) {
    $('[data-act="translate"]', menu).onclick = () => { menu.remove(); translateMessage(mid); };
  }
  $('[data-act="del-me"]', menu).onclick = () => { menu.remove(); deleteMessageForMe(mid); };
  if ($('[data-act="del-everyone"]', menu)) {
    $('[data-act="del-everyone"]', menu).onclick = () => { menu.remove(); deleteMessageForEveryone(mid); };
  }
}

// ---------------- Multi-Message Selection Mode ----------------
function startMessageSelection(initialMid) {
  S.msgSelectMode = true;
  S.selectedMsgIds = new Set(initialMid ? [initialMid] : []);
  renderMessages();
  updateSelectionBar();
}

function toggleMessageSelection(mid) {
  if (!S.selectedMsgIds) S.selectedMsgIds = new Set();
  if (S.selectedMsgIds.has(mid)) {
    S.selectedMsgIds.delete(mid);
  } else {
    S.selectedMsgIds.add(mid);
  }
  if (S.selectedMsgIds.size === 0) {
    exitMessageSelection();
    return;
  }
  renderMessages();
  updateSelectionBar();
}

function updateSelectionBar() {
  let bar = $('#msgSelectionBar');
  if (!S.msgSelectMode || !S.selectedMsgIds?.size) {
    if (bar) bar.remove();
    return;
  }
  const count = S.selectedMsgIds.size;
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'msgSelectionBar';
    bar.className = 'msg-selection-bar';
    $('#chatPane')?.appendChild(bar);
  }
  bar.innerHTML = `
    <div class="msg-sel-count"><span>${count}</span> message${count === 1 ? '' : 's'} selected</div>
    <div class="row gap-s" style="align-items:center">
      <button type="button" class="btn primary sm" id="msgSelForwardBtn" style="gap:6px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg>
        <span>Forward (${count})</span>
      </button>
      <button type="button" class="btn ghost sm" id="msgSelCancelBtn">Cancel</button>
    </div>
  `;
  $('#msgSelForwardBtn', bar).onclick = () => {
    const list = S.msgs.get(S.activeChatId) || [];
    const selected = list.filter(m => S.selectedMsgIds.has(m.id));
    exitMessageSelection();
    if (selected.length) {
      openForwardModal(selected);
    }
  };
  $('#msgSelCancelBtn', bar).onclick = () => {
    exitMessageSelection();
  };
}

function exitMessageSelection() {
  S.msgSelectMode = false;
  S.selectedMsgIds = new Set();
  $('#msgSelectionBar')?.remove();
  renderMessages();
}

// ---------------- Multi-File / Message Encryption & Forwarding ----------------
async function prepareEncryptedFilePayload(file, targetChatId) {
  const c = S.chats.get(targetChatId) || S.chats.get(S.activeChatId);
  if (!c) throw new Error('Active chat not found');
  if (!file || !file.size) throw new Error('Selected file is empty');
  const chunkSize = S.config.chunkSize || 5 * 1024 * 1024;
  const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));

  const fileKeyRaw = E2E.newKeyRaw();
  const fileKey = await E2E.importKey(fileKeyRaw);
  const { id: fileId } = await api('/api/files', {
    method: 'POST',
    body: { chatId: c.id, size: file.size, chunks: totalChunks, viewOnce: false }
  });

  for (let n = 0; n < totalChunks; n++) {
    const slice = file.slice(n * chunkSize, Math.min(file.size, (n + 1) * chunkSize));
    const plainBytes = new Uint8Array(await slice.arrayBuffer());
    const sealed = await E2E.encryptChunk(fileKey, plainBytes);
    await api(`/api/files/${fileId}/${n}`, { method: 'PUT', body: sealed });
  }

  await api(`/api/files/${fileId}/complete`, { method: 'POST' });

  const mime = file.type || 'application/octet-stream';
  if (window.ZovioLocalDB) {
    ZovioLocalDB.putMedia(fileId, {
      uid: S.user?.id,
      chatId: c.id,
      mime,
      name: file.name,
      size: file.size,
      blob: file
    }).catch(() => {});
  }
  const kind = mime.startsWith('video/')
    ? 'video'
    : mime.startsWith('image/')
      ? 'image'
      : mime.startsWith('audio/')
        ? 'audio'
        : 'file';

  return {
    id: 'fwd-upload-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    kind,
    senderId: S.user.id,
    fileIds: [fileId],
    _plain: {
      fileId,
      fileKey: fileKeyRaw,
      name: file.name,
      mime,
      size: file.size,
      chunks: totalChunks,
      caption: ''
    }
  };
}

async function forwardSingleMessage(targetId, m) {
  let c = S.chats.get(targetId);
  if (!c) {
    const other = S.users.get(targetId);
    if (!other) throw new Error('Target recipient not found');
    const { keys } = await wrapNewChatKey([S.user, other]);
    c = await api('/api/chats/dm', { method: 'POST', body: { userId: other.id, keys } });
    S.chats.set(c.id, c);
  }

  if (!m._plain && m.iv && m.ct) {
    const originChat = S.chats.get(m.chatId);
    if (originChat) {
      try { await decryptMsg(originChat, m); } catch (e) { console.warn('Could not decrypt message to forward', e); }
    }
  }

  const p = m._plain || m.body || {};
  let plainText = '';
  if (typeof p === 'string') plainText = p;
  else if (p && typeof p.text === 'string') plainText = p.text;
  else if (typeof m.body === 'string') plainText = m.body;

  let payload = {};
  if (m.kind === 'text') {
    payload = { text: plainText };
  } else if (m.kind === 'image' || m.kind === 'video' || m.kind === 'audio' || m.kind === 'file') {
    payload = {
      fileId: p.fileId,
      fileKey: p.fileKey,
      chunks: p.chunks || 1,
      name: p.name || 'File',
      mime: p.mime || 'application/octet-stream',
      size: p.size || 0,
      caption: p.caption || '',
      duration: p.duration || 0,
      url: p.url || ''
    };
  } else if (m.kind === 'sticker') {
    payload = {
      url: p.url || p.stickerUrl || '',
      emoji: p.emoji || '⭐',
      title: p.title || 'Sticker'
    };
    if (p.fileId) {
      payload.fileId = p.fileId;
      payload.fileKey = p.fileKey;
      payload.mime = p.mime || 'image/webp';
      payload.size = p.size || 0;
      payload.chunks = p.chunks || 1;
    }
  } else if (m.kind === 'gif') {
    payload = {
      url: p.url || p.gifUrl || '',
      title: p.title || 'GIF',
      caption: p.caption || ''
    };
    if (p.giphyId) payload.giphyId = p.giphyId;
    if (p.fallbackUrl) payload.fallbackUrl = p.fallbackUrl;
    if (p.fileId) {
      payload.fileId = p.fileId;
      payload.fileKey = p.fileKey;
      payload.mime = p.mime || 'image/gif';
      payload.size = p.size || 0;
      payload.chunks = p.chunks || 1;
    }
  } else if (m.kind === 'location' || m.kind === 'live') {
    payload = {
      lat: p.lat,
      lng: p.lng,
      label: p.label || ''
    };
  } else if (m.kind === 'poll') {
    payload = {
      question: p.question || '',
      options: Array.isArray(p.options) ? [...p.options] : []
    };
  } else if (m.kind === 'todo') {
    payload = {
      title: p.title || '',
      items: Array.isArray(p.items) ? [...p.items] : []
    };
  } else {
    payload = typeof p === 'object' ? { ...p } : { text: String(p || '') };
  }

  const fileIds = (payload.fileId ? [payload.fileId] : (m.fileIds || [])).filter(Boolean);
  const body = {
    kind: m.kind,
    forwardedFrom: m.senderId || S.user.id,
    fileIds,
    pollMulti: !!m.pollMulti
  };

  if (c.type === 'channel') {
    body.body = payload;
  } else {
    const key = await getChatKey(c, c.keyVersion || 1);
    const box = await E2E.encryptJSON(key, payload);
    body.iv = box.iv;
    body.ct = box.ct;
    body.keyVersion = c.keyVersion || 1;
  }

  const res = await api(`/api/chats/${c.id}/messages`, { method: 'POST', body });
  if (res && res.id) {
    await onIncomingMessage(res, true);
  }
  return res;
}

function getItemPreviewShort(m) {
  const p = m._plain || m.body || {};
  if (m.kind === 'text') {
    const txt = p.text || (typeof p === 'string' ? p : '') || (typeof m.body === 'string' ? m.body : '') || 'Message';
    return txt.length > 32 ? txt.slice(0, 32) + '…' : txt;
  }
  if (m.kind === 'image') return `📷 ${p.name || 'Photo'}`;
  if (m.kind === 'video') return `🎬 ${p.name || 'Video'}`;
  if (m.kind === 'audio') return `🎵 Voice / Audio`;
  if (m.kind === 'file') return `📎 ${p.name || 'File'}`;
  if (m.kind === 'sticker') return `⭐ Sticker ${p.emoji || ''}`;
  if (m.kind === 'gif') return `👾 GIF: ${p.title || 'GIF'}`;
  if (m.kind === 'poll') return `📊 ${p.question || 'Poll'}`;
  if (m.kind === 'todo') return `☑️ ${p.title || 'To-Do'}`;
  return 'Message';
}

function openForwardModal(targetMessages) {
  let itemsToForward = Array.isArray(targetMessages) ? [...targetMessages].filter(Boolean) : [targetMessages].filter(Boolean);
  if (!itemsToForward.length) return toast('No messages selected to forward', 'warn');

  const destinations = [];
  const chatList = Array.from(S.chats.values()).filter(c => {
    if (c.type === 'channel') {
      return c.ownerId === S.user?.id || (c.admins || []).includes(S.user?.id) || c.isAdmin;
    }
    return true;
  });

  chatList.forEach(c => {
    const d = chatDisplay(c);
    destinations.push({
      id: c.id,
      title: d.title,
      sub: d.sub || (c.type === 'self' ? 'Saved Messages' : c.type === 'group' ? `${(c.members || []).length} members` : ''),
      avatar: d.ava,
      isChat: true
    });
  });

  const existingDmUserIds = new Set(
    chatList.filter(c => c.type === 'dm').map(c => ((c.members || []).find(id => id !== S.user?.id) || ''))
  );
  (S.user?.friends || []).forEach(fid => {
    if (!existingDmUserIds.has(fid) && fid !== S.user?.id) {
      const u = S.users.get(fid);
      if (u) {
        destinations.push({
          id: u.id,
          title: u.name,
          sub: `@${u.username}`,
          avatar: u,
          isChat: false
        });
      }
    }
  });

  const selectedTargets = new Set();
  let filterQuery = '';

  function renderPreviewHeader() {
    if (itemsToForward.length === 1) {
      return `
        <div class="fwd-preview-kicker">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg>
          <span>Forwarding 1 message / item</span>
        </div>
        <div class="fwd-preview-content">${esc(getItemPreviewShort(itemsToForward[0]))}</div>
      `;
    }
    return `
      <div class="fwd-preview-kicker">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg>
        <span>Forwarding ${itemsToForward.length} items (messages & files)</span>
      </div>
      <div class="fwd-items-preview">
        ${itemsToForward.map(it => `<span class="fwd-item-chip">${esc(getItemPreviewShort(it))}</span>`).join('')}
      </div>
    `;
  }

  showModal('Forward Messages & Files', `
    <div class="fwd-modal-wrap">
      <div class="fwd-preview-card" id="fwdPreviewCard">
        ${renderPreviewHeader()}
      </div>

      <div class="fwd-add-more-row">
        <button type="button" class="fwd-add-more-btn" id="fwdAddMoreFilesBtn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>+ Add more files to forward together</span>
        </button>
        <input type="file" id="fwdModalFilePicker" class="hidden" multiple>
      </div>

      <div class="fwd-search-row">
        <div class="fwd-search-wrap">
          <span class="fwd-search-ico">${icon('search')}</span>
          <input type="text" id="fwdSearchInput" class="input sm" placeholder="Search chats or friends…" autocomplete="off">
        </div>
        <span id="fwdCountBadge" class="fwd-count-badge">0 / 10 selected</span>
      </div>

      <div class="fwd-list-container" id="fwdListContainer"></div>

      <div class="fwd-modal-footer">
        <button type="button" class="btn ghost" id="fwdCancelBtn">Cancel</button>
        <button type="button" class="btn primary lg" id="fwdSubmitBtn" disabled>
          <span>Forward</span>
        </button>
      </div>
    </div>
  `, box => {
    const listEl = $('#fwdListContainer', box);
    const searchInp = $('#fwdSearchInput', box);
    const countBadge = $('#fwdCountBadge', box);
    const submitBtn = $('#fwdSubmitBtn', box);
    const cancelBtn = $('#fwdCancelBtn', box);
    const addMoreBtn = $('#fwdAddMoreFilesBtn', box);
    const filePicker = $('#fwdModalFilePicker', box);
    const previewCard = $('#fwdPreviewCard', box);

    cancelBtn.onclick = () => closeModal();

    function updateBadgeAndButton() {
      const count = selectedTargets.size;
      countBadge.textContent = `${count} / 10 selected`;
      countBadge.classList.toggle('max-limit', count >= 10);
      submitBtn.disabled = count === 0;
      submitBtn.innerHTML = `<span>Forward ${itemsToForward.length} item${itemsToForward.length === 1 ? '' : 's'} to ${count} recipient${count === 1 ? '' : 's'}</span>`;
    }

    addMoreBtn.onclick = () => filePicker.click();
    filePicker.onchange = async () => {
      const files = Array.from(filePicker.files);
      filePicker.value = '';
      if (!files.length) return;
      addMoreBtn.disabled = true;
      addMoreBtn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block"></span> Encrypting ${files.length} file(s)...`;
      try {
        for (const file of files) {
          const item = await prepareEncryptedFilePayload(file, S.activeChatId);
          itemsToForward.push(item);
        }
        previewCard.innerHTML = renderPreviewHeader();
        updateBadgeAndButton();
        toast(`Added ${files.length} file(s) to forward batch!`, 'ok');
      } catch (err) {
        toast('Failed to prepare file: ' + err.message, 'err');
      } finally {
        addMoreBtn.disabled = false;
        addMoreBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>+ Add more files to forward together</span>
        `;
      }
    };

    function renderList() {
      const q = filterQuery.toLowerCase();
      const filtered = destinations.filter(d => !q || d.title.toLowerCase().includes(q) || (d.sub || '').toLowerCase().includes(q));

      if (!filtered.length) {
        listEl.innerHTML = `<div class="empty-inline-card" style="padding:20px;text-align:center"><div class="muted xs">No chats or friends match "${esc(filterQuery)}"</div></div>`;
        return;
      }

      listEl.innerHTML = filtered.map(d => {
        const isChecked = selectedTargets.has(d.id);
        return `
          <div class="fwd-row ${isChecked ? 'selected' : ''}" data-tid="${d.id}">
            <div class="fwd-row-check">
              <input type="checkbox" ${isChecked ? 'checked' : ''} tabindex="-1">
            </div>
            ${avatarHTML(d.avatar, 'sm')}
            <div class="fwd-row-info">
              <div class="fwd-row-title">${esc(d.title)}</div>
              <div class="fwd-row-sub muted">${esc(d.sub)}</div>
            </div>
          </div>
        `;
      }).join('');

      $$('.fwd-row', listEl).forEach(row => {
        row.onclick = () => {
          const tid = row.dataset.tid;
          if (selectedTargets.has(tid)) {
            selectedTargets.delete(tid);
            row.classList.remove('selected');
            const chk = row.querySelector('input[type="checkbox"]');
            if (chk) chk.checked = false;
            updateBadgeAndButton();
          } else {
            if (selectedTargets.size >= 10) {
              toast('You can select a maximum of 10 recipients at a time', 'warn');
              countBadge.classList.add('shake');
              setTimeout(() => countBadge.classList.remove('shake'), 500);
              return;
            }
            selectedTargets.add(tid);
            row.classList.add('selected');
            const chk = row.querySelector('input[type="checkbox"]');
            if (chk) chk.checked = true;
            updateBadgeAndButton();
          }
        };
      });
    }

    searchInp.oninput = () => {
      filterQuery = searchInp.value.trim();
      renderList();
    };

    submitBtn.onclick = async () => {
      if (!selectedTargets.size || !itemsToForward.length) return;
      submitBtn.disabled = true;
      const totalOps = selectedTargets.size * itemsToForward.length;
      let completedOps = 0;
      submitBtn.innerHTML = `<span>Forwarding (0/${totalOps})…</span>`;

      try {
        let sentRecipients = 0;
        for (const tid of selectedTargets) {
          try {
            for (const item of itemsToForward) {
              await forwardSingleMessage(tid, item);
              completedOps++;
              submitBtn.innerHTML = `<span>Forwarding (${completedOps}/${totalOps})…</span>`;
            }
            sentRecipients++;
          } catch (e) {
            console.error('Failed to forward to target', tid, e);
          }
        }
        closeModal();
        SoundFX?.play('send');
        toast(`Forwarded ${itemsToForward.length} item${itemsToForward.length === 1 ? '' : 's'} to ${sentRecipients} recipient${sentRecipients === 1 ? '' : 's'}!`, 'ok');
      } catch (err) {
        toast('Forwarding error: ' + err.message, 'err');
        submitBtn.disabled = false;
        updateBadgeAndButton();
      }
    };

    renderList();
    setTimeout(() => searchInp.focus(), 60);
  });
}

function fmtDuration(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function groupChatMessages(list) {
  const groups = [];
  let i = 0;
  while (i < list.length) {
    const m = list[i];
    const isMedia = !m._uploadState && !m.deleted && !m.deletedForEveryone && !m.viewOnce && (m.kind === 'image' || m.kind === 'video');
    const isSticker = !m.deleted && !m.deletedForEveryone && m.kind === 'sticker';

    if (isMedia) {
      const album = [m];
      let j = i + 1;
      while (j < list.length) {
        const next = list[j];
        const nextIsMedia = !next._uploadState && !next.deleted && !next.deletedForEveryone && !next.viewOnce && (next.kind === 'image' || next.kind === 'video');
        const sameSender = next.senderId === m.senderId;
        const sameDay = new Date(next.ts).toDateString() === new Date(m.ts).toDateString();
        const closeInTime = Math.abs(next.ts - m.ts) < 3 * 60 * 1000;
        if (nextIsMedia && sameSender && sameDay && closeInTime) {
          album.push(next);
          j++;
        } else {
          break;
        }
      }
      if (album.length >= 2) {
        groups.push({ type: 'media-album', messages: album });
        i = j;
        continue;
      }
    }

    if (isSticker) {
      const stickerGroup = [m];
      let j = i + 1;
      while (j < list.length) {
        const next = list[j];
        const nextIsSticker = !next.deleted && !next.deletedForEveryone && next.kind === 'sticker';
        const sameSender = next.senderId === m.senderId;
        const sameDay = new Date(next.ts).toDateString() === new Date(m.ts).toDateString();
        const closeInTime = Math.abs(next.ts - m.ts) < 3 * 60 * 1000;
        if (nextIsSticker && sameSender && sameDay && closeInTime) {
          stickerGroup.push(next);
          j++;
        } else {
          break;
        }
      }
      if (stickerGroup.length >= 2) {
        groups.push({ type: 'sticker-group', messages: stickerGroup });
        i = j;
        continue;
      }
    }

    groups.push({ type: 'single', message: m });
    i++;
  }
  return groups;
}

function renderMediaAlbumGroup(c, messages, byId, getDayTag) {
  const latest = messages[messages.length - 1];
  const day = new Date(latest.ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  const dayTag = getDayTag(day);

  const out = latest.senderId === S.user.id;
  const sender = S.users.get(latest.senderId) || { name: 'Member', avatarColor: '#7c5cff' };
  const cls = c.type === 'channel' ? 'channel-post' : (out ? 'out' : 'in');
  const showSender = c.type === 'group' && !out;

  const isSelected = messages.some(m => S.selectedMsgIds?.has(m.id));
  const selectCheckHTML = `<div class="msg-select-check ${isSelected ? 'checked' : ''}" data-sel="${latest.id}" title="Select message">${isSelected ? '✓' : ''}</div>`;

  const isStarred = messages.some(m => (m.starredBy || []).includes(S.user.id));
  const starBadge = isStarred ? `<span class="star-badge" title="Starred">${icon('starFill')}</span>` : '';

  const readCount = (latest.readBy || []).filter(u => u !== latest.senderId).length;
  const metaRight = c.type === 'channel'
    ? `<span>👁️ ${latest.views || 1}</span>`
    : (out ? `<span class="checks ${readCount ? 'read' : ''}">${readCount ? '✓✓' : '✓'}</span>` : '');

  const allReactions = {};
  messages.forEach(m => {
    Object.entries(m.reactions || {}).forEach(([em, uids]) => {
      allReactions[em] = [...new Set([...(allReactions[em] || []), ...uids])];
    });
  });
  const reacts = Object.entries(allReactions);
  const reactHTML = reacts.length ? `<div class="reactions">${reacts.map(([em, uids]) =>
    `<span class="react-chip ${uids.includes(S.user.id) ? 'mine' : ''}" data-react="${esc(em)}" data-mid="${latest.id}">${esc(em)} <b>${uids.length}</b></span>`
  ).join('')}</div>` : '';

  const hasForwarded = messages.some(m => m.forwardedFrom);

  const captions = messages
    .map(m => (m._plain?.caption || m.body?.caption || '').trim())
    .filter(Boolean);

  const countClass = `wa-album-count-${Math.min(messages.length, 4)}`;

  return `${dayTag}
    <div class="msg ${cls} ${isSelected ? 'msg-selected' : ''} wa-album-msg" id="m-${latest.id}" data-mid="${latest.id}" data-album-mids="${messages.map(m => m.id).join(',')}">
      ${selectCheckHTML}
      ${showSender ? avatarHTML(sender, 'sm') : ''}
      <div class="bubble has-media-only wa-album-bubble">
        <div class="msg-actions reaction-tab">
          ${REACTIONS.map(em => `<button type="button" class="react-pill-btn" data-react="${em}" data-mid="${latest.id}" title="React ${em}">${em}</button>`).join('')}
          <button type="button" class="react-pill-btn react-pill-more-btn" data-react-more="${latest.id}" title="More emojis">+</button>
        </div>
        ${hasForwarded ? `
          <div class="msg-forwarded-tag">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" class="forward-ico"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg>
            <span>Forwarded album (${messages.length} items)</span>
          </div>
        ` : ''}
        ${showSender ? `<div class="msg-sender">${esc(sender.name)}</div>` : ''}

        <div class="wa-album-grid ${countClass}" data-album-id="alb-${latest.id}">
          ${messages.slice(0, 4).map((m, idx) => {
            const p = m._plain || m.body || {};
            const isVid = m.kind === 'video' || (p.mime || '').startsWith('video/');
            const dur = p.duration ? fmtDuration(p.duration) : '';
            const isFourthWithMore = idx === 3 && messages.length > 4;
            const moreCount = messages.length - 3;
            return `
              <div class="wa-album-item" data-mid="${m.id}" title="${esc(p.name || (isVid ? 'Video' : 'Photo'))}">
                <div class="wa-album-media-slot" data-media="${m.id}" data-kind="${isVid ? 'video' : 'image'}">
                  <div class="file-card" style="padding:6px"><div class="file-ico" style="width:24px;height:24px">${isVid ? icon('video') : icon('image')}</div></div>
                </div>
                ${isVid ? `
                  <div class="wa-album-play-badge">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="#fff"><polygon points="7,5 19,12 7,19"/></svg>
                  </div>
                  ${dur ? `<span class="wa-album-duration-tag">▶ ${dur}</span>` : ''}
                ` : ''}
                ${isFourthWithMore ? `
                  <div class="wa-album-more-overlay">+${moreCount}</div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>

        ${captions.length ? `<div class="msg-text wa-album-captions">${captions.map(c => highlightMatches(c, S.chatSearchQuery)).join('<br>')}</div>` : ''}

        <div class="msg-meta"><span>${fmtTime(latest.ts)}</span>${metaRight}${starBadge}</div>
        ${reactHTML}
      </div>
    </div>
  `;
}

function renderStickerGroup(c, messages, byId, getDayTag) {
  const latest = messages[messages.length - 1];
  const day = new Date(latest.ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  const dayTag = getDayTag(day);

  const out = latest.senderId === S.user.id;
  const sender = S.users.get(latest.senderId) || { name: 'Member', avatarColor: '#7c5cff' };
  const cls = c.type === 'channel' ? 'channel-post' : (out ? 'out' : 'in');
  const showSender = c.type === 'group' && !out;

  const isSelected = messages.some(m => S.selectedMsgIds?.has(m.id));
  const selectCheckHTML = `<div class="msg-select-check ${isSelected ? 'checked' : ''}" data-sel="${latest.id}" title="Select message">${isSelected ? '✓' : ''}</div>`;

  const isStarred = messages.some(m => (m.starredBy || []).includes(S.user.id));
  const starBadge = isStarred ? `<span class="star-badge" title="Starred">${icon('starFill')}</span>` : '';

  const readCount = (latest.readBy || []).filter(u => u !== latest.senderId).length;
  const metaRight = c.type === 'channel'
    ? `<span>👁️ ${latest.views || 1}</span>`
    : (out ? `<span class="checks ${readCount ? 'read' : ''}">${readCount ? '✓✓' : '✓'}</span>` : '');

  const countClass = messages.length === 2
    ? 'wa-sticker-count-2'
    : messages.length === 3
      ? 'wa-sticker-count-3'
      : messages.length === 4
        ? 'wa-sticker-count-4'
        : 'wa-sticker-count-more';

  return `${dayTag}
    <div class="msg ${cls} ${isSelected ? 'msg-selected' : ''} wa-sticker-group-msg" id="m-${latest.id}" data-mid="${latest.id}" data-sticker-mids="${messages.map(m => m.id).join(',')}">
      ${selectCheckHTML}
      ${showSender ? avatarHTML(sender, 'sm') : ''}
      <div class="bubble sticker-bubble sticker-group-bubble">
        <div class="msg-actions reaction-tab">
          ${REACTIONS.map(em => `<button type="button" class="react-pill-btn" data-react="${em}" data-mid="${latest.id}" title="React ${em}">${em}</button>`).join('')}
          <button type="button" class="react-pill-btn react-pill-more-btn" data-react-more="${latest.id}" title="More emojis">+</button>
        </div>
        ${showSender ? `<div class="msg-sender" style="margin-bottom:4px">${esc(sender.name)}</div>` : ''}

        <div class="wa-sticker-grid ${countClass}">
          ${messages.map(m => {
            const p = m._plain || m.body || {};
            const stickerUrl = p.url || p.stickerUrl || '';
            const emoji = p.emoji || '';
            return `
              <div class="msg-sticker-container wa-sticker-item" data-mid="${m.id}" data-sticker-url="${esc(stickerUrl)}" title="${esc(p.title || 'Sticker')}">
                <img src="${esc(stickerUrl)}" alt="${esc(emoji || 'Sticker')}" class="msg-sticker-img" loading="lazy">
                ${emoji ? `<span class="msg-sticker-hover-emoji" title="${esc(emoji)}">${esc(emoji)}</span>` : ''}
              </div>
            `;
          }).join('')}
        </div>

        <div class="msg-meta" style="margin-top:4px"><span>${fmtTime(latest.ts)}</span>${metaRight}${starBadge}</div>
      </div>
    </div>
  `;
}

function renderMessages(scrollMode = 'auto') {
  const c = S.chats.get(S.activeChatId);
  const inner = $('#msgsInner');
  const sc = $('#msgsScroll');
  if (!c || !inner) return;

  const prevScrollTop = sc ? sc.scrollTop : 0;
  const wasNearBottom = sc ? ((sc.scrollHeight - sc.scrollTop - sc.clientHeight) < 160) : true;

  renderPinnedBanner(c);

  const rawList = S.msgs.get(c.id) || [];
  const list = rawList.filter(m => !(m.deletedFor || []).includes(S.user.id));
  if (!list.length) {
    inner.innerHTML = `<div class="day-sep">${c.type === 'channel' ? '🔥 First ZovioCast broadcast coming soon' : 'Say hello to start the conversation!'}</div>`;
    return;
  }

  let lastDay = '';
  const byId = new Map(list.map(m => [m.id, m]));
  const groups = groupChatMessages(list);

  inner.innerHTML = groups.map(grp => {
    if (grp.type === 'media-album') {
      return renderMediaAlbumGroup(c, grp.messages, byId, (day) => {
        if (day !== lastDay) {
          lastDay = day;
          return `<div class="day-sep">${day}</div>`;
        }
        return '';
      });
    }

    if (grp.type === 'sticker-group') {
      return renderStickerGroup(c, grp.messages, byId, (day) => {
        if (day !== lastDay) {
          lastDay = day;
          return `<div class="day-sep">${day}</div>`;
        }
        return '';
      });
    }

    const m = grp.message;
    const day = new Date(m.ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    const dayTag = day !== lastDay ? (lastDay = day, `<div class="day-sep">${day}</div>`) : '';
    if (m.kind === 'system') return `${dayTag}<div class="sys-msg">${esc(m.body)}</div>`;

    const out = m.senderId === S.user.id;
    const sender = S.users.get(m.senderId) || { name: 'Member', avatarColor: '#7c5cff' };
    const cls = c.type === 'channel' ? 'channel-post' : (out ? 'out' : 'in');
    const showSender = c.type === 'group' && !out;

    const isDeleted = m.deleted || m.deletedForEveryone;
    const canReact = !isDeleted;

    let replyHTML = '';
    if (m.replyTo && byId.has(m.replyTo)) {
      const rm = byId.get(m.replyTo);
      const rs = S.users.get(rm.senderId)?.name || 'Message';
      replyHTML = `<div class="msg-reply" data-jump="${rm.id}"><strong>${esc(rs)}</strong><div>${esc(msgPreviewText(rm).slice(0, 80))}</div></div>`;
    }

    const bodyHTML = isDeleted
      ? `<div class="muted" style="font-style:italic">This message was deleted</div>`
      : renderMsgBody(c, m);

    const isStarred = (m.starredBy || []).includes(S.user.id);
    const starBadge = isStarred ? `<span class="star-badge" title="Starred">${icon('starFill')}</span>` : '';

    const p = m._plain || m.body || {};
    const hasText = !isDeleted && Boolean((p && p.text) || (typeof p === 'string' && p.length));
    const targetLangs = [
      { code: 'en', name: 'English' },
      { code: 'hi', name: 'Hindi' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'ja', name: 'Japanese' },
      { code: 'ar', name: 'Arabic' },
      { code: 'bn', name: 'Bengali' },
      { code: 'ru', name: 'Russian' },
      { code: 'pt', name: 'Portuguese' }
    ];
    const curLang = m._targetLang || 'en';
    const translationHTML = (!isDeleted && m._showTranslation && m._translatedText) ? `
      <div class="msg-translation-card">
        <div class="msg-translation-head">
          <div class="msg-trans-badge">
            ${icon('globe')}
            <select class="msg-trans-select" data-mid="${m.id}" title="Select translation language">
              ${targetLangs.map(l => `<option value="${l.code}" ${curLang === l.code ? 'selected' : ''}>${l.name}</option>`).join('')}
            </select>
          </div>
          <button type="button" class="msg-trans-close-btn" data-hidetranslate="${m.id}" title="Hide translation">✕</button>
        </div>
        <div class="msg-translation-body">${esc(m._translatedText)}</div>
      </div>` : '';

    const readCount = (m.readBy || []).filter(u => u !== m.senderId).length;
    const metaRight = c.type === 'channel'
      ? `<span>👁️ ${m.views || 1}</span>`
      : (out ? `<span class="checks ${readCount ? 'read' : ''}">${readCount ? '✓✓' : '✓'}</span>` : '');

    const reacts = Object.entries(m.reactions || {});
    const reactHTML = reacts.length ? `<div class="reactions">${reacts.map(([em, uids]) =>
      `<span class="react-chip ${uids.includes(S.user.id) ? 'mine' : ''}" data-react="${esc(em)}" data-mid="${m.id}">${esc(em)} <b>${uids.length}</b></span>`
    ).join('')}</div>` : '';

    const isPinned = c.pinnedMessageId === m.id;
    const isMedia = !isDeleted && !m.viewOnce && (m.kind === 'image' || m.kind === 'video' || m.kind === 'gif');
    const isMediaOnly = isMedia && !p.caption && !hasText;
    const isMediaWithCaption = isMedia && Boolean(p.caption);
    const isPlainTextMsg = !isDeleted && !m.viewOnce && (!m.kind || m.kind === 'text') && !replyHTML && !translationHTML && !m.forwardedFrom && !showSender && !bodyHTML.includes('msg-yt-card') && !bodyHTML.includes('msg-link-preview-card');
    const isNonTextCard = !isDeleted && !isPlainTextMsg && (
      ['image', 'video', 'audio', 'voice', 'file', 'sticker', 'gif', 'poll', 'todo', 'location', 'contact', 'call'].includes(m.kind) ||
      m.viewOnce ||
      bodyHTML.includes('fire-audio-player') ||
      bodyHTML.includes('file-card') ||
      bodyHTML.includes('msg-call-bubble') ||
      bodyHTML.includes('poll-card') ||
      bodyHTML.includes('todo-card') ||
      bodyHTML.includes('loc-card') ||
      bodyHTML.includes('music-card')
    );
    const bubbleClass = [
      m.kind === 'sticker' ? 'sticker-bubble' : '',
      m.kind === 'gif' ? 'gif-bubble' : '',
      isMediaOnly ? 'has-media-only' : '',
      isMediaWithCaption ? 'has-media-caption' : '',
      isPlainTextMsg ? 'is-plain-text' : '',
      isNonTextCard ? 'is-non-text-card' : ''
    ].filter(Boolean).join(' ');

    const isSelected = S.selectedMsgIds?.has(m.id);
    const selectCheckHTML = `<div class="msg-select-check ${isSelected ? 'checked' : ''}" data-sel="${m.id}" title="Select message">${isSelected ? '✓' : ''}</div>`;

    return `${dayTag}
      <div class="msg ${cls} ${isSelected ? 'msg-selected' : ''}" id="m-${m.id}" data-mid="${m.id}">
        ${selectCheckHTML}
        ${c.type === 'group' && !out ? avatarHTML(sender, 'sm') : ''}
        <div class="bubble ${bubbleClass}">
          ${!isDeleted && canReact ? `
            <div class="msg-actions reaction-tab">
              ${REACTIONS.map(em => `<button type="button" class="react-pill-btn" data-react="${em}" data-mid="${m.id}" title="React ${em}">${em}</button>`).join('')}
              <button type="button" class="react-pill-btn react-pill-more-btn" data-react-more="${m.id}" title="More emojis">+</button>
              ${hasText ? `<button type="button" class="react-pill-btn" data-translate="${m.id}" title="Translate message">${icon('globe')}</button>` : ''}
            </div>
          ` : ''}
          ${m.forwardedFrom ? `
            <div class="msg-forwarded-tag">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" class="forward-ico"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg>
              <span>Forwarded message</span>
            </div>
          ` : ''}
          ${showSender ? `<div class="msg-sender">${esc(sender.name)}</div>` : ''}
          ${replyHTML}
          ${bodyHTML}
          ${translationHTML}
          <div class="msg-meta"><span>${fmtTime(m.ts)}</span>${m.edited ? ' <small class="msg-edited-tag" style="opacity:0.75;font-size:10.5px;margin-left:3px">(edited)</small>' : ''}${metaRight}${starBadge}</div>
          ${reactHTML}
        </div>
      </div>`;
  }).join('');

  if (S.msgSelectMode) inner.classList.add('msgs-selecting');
  else inner.classList.remove('msgs-selecting');

  bindMessageInteractions(inner, c);
  if (sc) {
    if (scrollMode === 'preserve') {
      sc.scrollTop = prevScrollTop;
    } else if (scrollMode === 'bottom') {
      S.userScrolledUp = false;
      sc.scrollTop = sc.scrollHeight;
      sc.dataset.hasScrolled = 'true';
      const scrollDownBtn = $('#scrollBottomBtn');
      if (scrollDownBtn) scrollDownBtn.classList.add('hidden');
    } else {
      if ((!S.userScrolledUp && wasNearBottom) || !sc.dataset.hasScrolled) {
        sc.scrollTop = sc.scrollHeight;
        sc.dataset.hasScrolled = 'true';
      } else {
        sc.scrollTop = prevScrollTop;
        const scrollDownBtn = $('#scrollBottomBtn');
        if (scrollDownBtn) {
          const distFromBottom = sc.scrollHeight - sc.scrollTop - sc.clientHeight;
          scrollDownBtn.classList.toggle('hidden', distFromBottom <= 140);
        }
      }
    }
  }

  // Anchor to bottom when media/images load asynchronously if user is viewing latest messages
  inner.querySelectorAll('img').forEach(img => {
    if (!img.complete) {
      img.addEventListener('load', () => {
        if (!S.userScrolledUp && (scrollMode === 'bottom' || (sc && (sc.scrollHeight - sc.scrollTop - sc.clientHeight) < 80))) {
          sc.scrollTop = sc.scrollHeight;
        }
      }, { once: true });
    }
  });
}

function extractYouTubeId(url) {
  if (!url) return null;
  const m = String(url).match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  return m ? m[1] : null;
}

function formatWhatsappInlineText(rawText, query = '') {
  let html = highlightMatches(rawText, query);
  // Code spans first so markdown delimiters inside code stay literal
  html = html.replace(/`([^`\n]+?)`/g, '<code class="msg-inline-code">$1</code>');
  // Bold (*text*)
  html = html.replace(/(^|[\s(>\[~])\*([^*\n]+?)\*(?=$|[\s.,!?;:)<\]~])/g, '$1<strong>$2</strong>');
  // Italic (_text_)
  html = html.replace(/(^|[\s(>\[*~])_([^_\n]+?)_(?=$|[\s.,!?;:)<\]*~])/g, '$1<em>$2</em>');
  // Strikethrough (~text~)
  html = html.replace(/(^|[\s(>\[*_])~([^~\n]+?)~(?=$|[\s.,!?;:)<\]*_])/g, '$1<del>$2</del>');
  return html;
}

function renderRichTextWithLinks(rawText, query = '') {
  const str = String(rawText || '');
  if (!str) return '';

  const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;
  const parts = [];
  const urls = [];
  let lastIdx = 0;
  let match;

  while ((match = urlRegex.exec(str)) !== null) {
    if (match.index > lastIdx) {
      parts.push({ type: 'text', val: str.slice(lastIdx, match.index) });
    }
    // Strip trailing punctuation like .,!?) that isn't part of the URL
    let cleanUrl = match[0];
    let trailing = '';
    while (/[.,!?;:)\]]$/.test(cleanUrl)) {
      trailing = cleanUrl.slice(-1) + trailing;
      cleanUrl = cleanUrl.slice(0, -1);
    }
    parts.push({ type: 'url', val: cleanUrl });
    if (urls.length < 2 && !urls.includes(cleanUrl)) urls.push(cleanUrl);
    if (trailing) parts.push({ type: 'text', val: trailing });
    lastIdx = urlRegex.lastIndex;
  }
  if (lastIdx < str.length) {
    parts.push({ type: 'text', val: str.slice(lastIdx) });
  }

  let inlineHTML = parts.map(pt => {
    if (pt.type === 'url') {
      const safeUrl = esc(pt.val);
      return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="msg-rich-link" data-extlink="${safeUrl}">${safeUrl}</a>`;
    }
    return formatWhatsappInlineText(pt.val, query);
  }).join('');

  // Render bullet lines cleanly when text lines start with - , * , or •
  if (/(^|\n)\s*[-*•]\s+/.test(str)) {
    inlineHTML = inlineHTML.split('\n').map(line => {
      const bm = line.match(/^\s*(?:[-*•])\s+(.*)$/);
      if (bm) {
        return `<div class="msg-bullet-line"><span class="msg-bullet-dot">•</span><span class="msg-bullet-body">${bm[1]}</span></div>`;
      }
      return line;
    }).join('<br>');
    inlineHTML = inlineHTML.replace(/<\/div><br><div/g, '</div><div');
  }

  let cardsHTML = '';
  for (const u of urls) {
    const ytId = extractYouTubeId(u);
    const safeUrl = esc(u);
    if (ytId) {
      cardsHTML += `
        <div class="msg-yt-card" data-ytid="${esc(ytId)}">
          <div class="msg-yt-thumb-wrap" data-ytplay="${esc(ytId)}" title="Click to play YouTube video inline">
            <img src="https://i.ytimg.com/vi/${esc(ytId)}/maxresdefault.jpg" onerror="this.onerror=null;this.src='https://i.ytimg.com/vi/${esc(ytId)}/hqdefault.jpg';" alt="YouTube Video" class="msg-yt-thumb" loading="lazy">
            <div class="msg-yt-play-overlay">
              <div class="msg-yt-play-btn">
                <svg viewBox="0 0 68 48" width="54" height="38"><path d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#ff0000"></path><path d="M 45,24 27,14 27,34" fill="#fff"></path></svg>
              </div>
            </div>
            <span class="msg-yt-badge">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
              <span>YouTube</span>
            </span>
          </div>
          <div class="msg-yt-meta">
            <div class="msg-yt-info">
              <span class="msg-yt-domain">youtube.com</span>
              <span class="msg-yt-hint">Click thumbnail to play inline</span>
            </div>
            <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="msg-yt-action-pill" data-extlink="${safeUrl}">
              <span>Watch on YouTube</span>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
          </div>
        </div>
      `;
    } else {
      let host = u;
      try { host = new URL(u).hostname.replace(/^www\./, ''); } catch {}
      cardsHTML += `
        <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="msg-link-preview-card" data-extlink="${safeUrl}">
          <div class="msg-link-favicon-wrap">
            <img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64" alt="" class="msg-link-favicon" onerror="this.parentElement.style.display='none'">
          </div>
          <div class="msg-link-preview-info">
            <div class="msg-link-preview-host">
              <span>${esc(host)}</span>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </div>
            <div class="msg-link-preview-url">${safeUrl}</div>
          </div>
        </a>
      `;
    }
  }

  return `<div class="msg-text">${inlineHTML}</div>${cardsHTML}`;
}

function renderUploadRingSVG(pct = 2) {
  const clamped = Math.max(2, Math.min(100, Math.round(pct)));
  const circ = 94.25;
  const offset = (circ * (1 - clamped / 100)).toFixed(1);
  return `
    <div class="wa-upload-ring" role="progressbar" aria-valuenow="${clamped}" aria-valuemin="0" aria-valuemax="100">
      <svg class="wa-upload-ring-svg" viewBox="0 0 36 36">
        <circle class="wa-upload-ring-track" cx="18" cy="18" r="15"></circle>
        <circle class="wa-upload-ring-arc" cx="18" cy="18" r="15" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"></circle>
      </svg>
      <span class="wa-upload-pct">${clamped}%</span>
    </div>`;
}

function renderMsgBody(c, m) {
  const p = m._plain || m.body || {};
  if (m.viewOnce) {
    const opened = (m.viewedBy || []).includes(S.user.id);
    const isMine = m.senderId === S.user.id;
    const mediaLabel = (p.mime || '').startsWith('video/') || m.kind === 'video' ? 'video' : 'photo';
    return `
      <div class="view-once-card ${opened ? 'opened' : ''}" data-vo="${m.id}">
        <div class="vo-ring">1</div>
        <div>
          <div style="font-weight:700">${opened ? 'Opened' : (isMine ? `One-View ${mediaLabel} (sent)` : `Tap to open One-View ${mediaLabel}`)}</div>
          <small class="muted">${opened ? 'Media self-destructed after viewing' : 'Self-destructs after 1 view'}</small>
        </div>
      </div>`;
  }

  switch (m.kind) {
    case 'call': {
      const info = m.callInfo || (() => { try { return JSON.parse(m.body); } catch { return {}; } })();
      const isMe = m.senderId === S.user?.id;
      const mode = info.mode || 'audio';
      const status = info.status || 'completed';
      const isAnswered = status === 'completed';
      const isDeclined = status === 'declined';
      const isMissed = !isAnswered && !isDeclined;

      let bubbleState = isAnswered ? 'answered' : (isDeclined ? 'declined' : 'missed');
      let callTitle = mode === 'video' ? 'Video Call' : 'Voice Call';
      let callSub = '';

      if (isAnswered) {
        callSub = `${isMe ? '↗ Outgoing' : '↙ Incoming'} · ${typeof formatDuration === 'function' ? formatDuration(info.duration || 0) : (info.duration || 0) + 's'}`;
      } else if (isDeclined) {
        callSub = isMe ? '↗ Declined by contact' : '↙ Declined call';
      } else {
        callSub = isMe ? '↗ Cancelled call' : '↙ Missed call';
      }

      return `
        <div class="msg-call-bubble ${bubbleState}">
          <div class="msg-call-icon-wrap ${bubbleState}">
            ${mode === 'video' ? icon('video') : (isAnswered ? icon('phone') : icon('phoneOff'))}
          </div>
          <div class="msg-call-info">
            <strong class="msg-call-title">${esc(callTitle)}</strong>
            <div class="msg-call-sub">${esc(callSub)}</div>
          </div>
          <button type="button" class="msg-call-back-btn" data-callmode="${esc(mode)}" title="Call back">
            ${mode === 'video' ? icon('video') : icon('phone')}
            <span>Call back</span>
          </button>
        </div>
      `;
    }

    case 'story-mention': {
      const authorId = p.authorId || m.senderId;
      const previewImg = p.previewImg || '';
      const isUnavailable = Boolean(m.storyUnavailable || p.unavailable);

      if (isUnavailable) {
        return `
          <div class="story-mention-card is-unavailable" onclick="toast('This story is no longer available (deleted or expired)')">
            <div class="story-mention-info">
              <div class="story-mention-title" style="color:var(--text-muted, #94a3b8)">🚫 Story unavailable</div>
              <div class="story-mention-sub" style="font-size:12px;opacity:0.8">This story was deleted or expired</div>
            </div>
          </div>
        `;
      }

      return `
        <div class="story-mention-card" onclick="if (typeof openStoryViewerForUser === 'function') openStoryViewerForUser('${esc(authorId)}')">
          ${previewImg ? `<img src="${esc(previewImg)}" class="story-mention-thumb" alt="Story">` : ''}
          <div class="story-mention-info">
            <div class="story-mention-title">🔥 Mentioned you in their story</div>
            <div class="story-mention-sub">Tap to view story & reply 📸</div>
          </div>
        </div>
      `;
    }

    case 'sticker': {
      if (p.fileId) {
        return `<div class="media-slot" data-media="${m.id}" data-kind="sticker">
          <div class="file-card"><div class="file-ico">⭐</div><div class="file-info"><div class="file-name">${esc(p.title || 'Sticker')}</div><div class="file-sub">${fmtBytes(p.size || 0)}</div></div></div>
        </div>`;
      }
      const stickerUrl = p.url || p.stickerUrl || '';
      const emoji = p.emoji || '';
      return `
        <div class="msg-sticker-container" data-sticker-url="${esc(stickerUrl)}">
          <img src="${esc(stickerUrl)}" alt="${esc(emoji || 'Sticker')}" class="msg-sticker-img" loading="lazy">
          ${emoji ? `<span class="msg-sticker-hover-emoji" title="${esc(emoji)}">${esc(emoji)}</span>` : ''}
        </div>`;
    }

    case 'gif': {
      if (p.fileId) {
        return `<div class="media-slot" data-media="${m.id}" data-kind="gif">
          <div class="file-card"><div class="file-ico">${icon('gif')}</div><div class="file-info"><div class="file-name">${esc(p.title || 'GIF')}</div><div class="file-sub">${fmtBytes(p.size || 0)}</div></div></div>
        </div>${p.caption ? renderRichTextWithLinks(p.caption, S.chatSearchQuery) : ''}`;
      }
      const gifUrl = p.url || p.gifUrl || '';
      const title = p.title || 'GIF';
      const fallbackUrl = p.fallbackUrl || (p.giphyId ? `https://i.giphy.com/media/${p.giphyId}/200.gif` : '');
      const onErrAttr = `onerror="if(!this.dataset.retried){this.dataset.retried='1';const fb=this.dataset.fallbackUrl||(this.src.split('?')[0]!==this.src?this.src.split('?')[0]:'');if(fb){this.src=fb;return;}}const m=/media\\.giphy\\.com\\/media\\/(?:v1\\.[^/]+\\/)?([^/]+)\\//.exec(this.src);if(m&&!this.dataset.retried2){this.dataset.retried2='1';this.src='https://i.giphy.com/media/'+m[1]+'/200.gif';return;}if(this.dataset.giphyId&&!this.dataset.retried3){this.dataset.retried3='1';this.src='https://media.giphy.com/media/'+this.dataset.giphyId+'/giphy.gif';}"`;
      return `
        <div class="msg-gif-container" data-gif-url="${esc(gifUrl)}">
          <img src="${esc(gifUrl)}" data-fallback-url="${esc(fallbackUrl)}" data-giphy-id="${esc(p.giphyId || '')}" alt="${esc(title)}" class="msg-gif-img" loading="lazy" referrerpolicy="no-referrer" ${onErrAttr}>
          <span class="msg-gif-pill">GIF</span>
        </div>${p.caption ? renderRichTextWithLinks(p.caption, S.chatSearchQuery) : ''}`;
    }

    case 'image':
      if (m._uploadState) {
        return `<div class="media-slot wa-uploading-media">
          ${m._localPreviewUrl ? `<img class="media-img" src="${esc(m._localPreviewUrl)}" alt="${esc(p.name || 'Photo')}" style="max-height:280px;object-fit:cover;opacity:${m._uploadState === 'failed' ? '0.45' : '0.72'}">` : ''}
          <div class="wa-media-upload-overlay">
            ${m._uploadState === 'failed'
              ? `<button type="button" class="wa-upload-retry-btn pill-mode" data-retry-upload="${m.id}">${icon('refresh')} <span>Retry</span></button>`
              : renderUploadRingSVG(m._uploadPct)}
          </div>
        </div>${p.caption ? renderRichTextWithLinks(p.caption, S.chatSearchQuery) : ''}`;
      }
      return `<div class="media-slot" data-media="${m.id}" data-kind="image">
        <div class="file-card"><div class="file-ico">${icon('image')}</div><div class="file-info"><div class="file-name">${highlightMatches(p.name || 'Photo', S.chatSearchQuery)}</div><div class="file-sub">${fmtBytes(p.size || 0)}</div></div></div>
      </div>${p.caption ? renderRichTextWithLinks(p.caption, S.chatSearchQuery) : ''}`;

    case 'audio':
      if (m._uploadState) {
        return `<div class="file-card wa-upload-file-card" data-upload-mid="${m.id}">
          <div class="file-ico ${m._uploadState === 'failed' ? 'is-failed' : ''}">${m._uploadState === 'failed' ? icon('alert') : renderUploadRingSVG(m._uploadPct)}</div>
          <div class="file-info">
            <div class="file-name">${highlightMatches(p.name || 'Voice note', S.chatSearchQuery)}</div>
            <div class="file-sub">${m._uploadState === 'failed' ? 'Failed · Tap retry' : fmtBytes(p.size || 0)}</div>
          </div>
          ${m._uploadState === 'failed' ? `<button type="button" class="wa-upload-retry-btn" data-retry-upload="${m.id}">${icon('refresh')} <span>Retry</span></button>` : ''}
        </div>${p.caption ? renderRichTextWithLinks(p.caption, S.chatSearchQuery) : ''}`;
      }
      return `<div class="media-slot" data-media="${m.id}" data-kind="audio">
        <div class="file-card"><div class="file-ico">${icon('mic')}</div><div class="file-info"><div class="file-name">${highlightMatches(p.name || 'Voice note', S.chatSearchQuery)}</div><div class="file-sub">${fmtBytes(p.size || 0)}</div></div></div>
      </div>${p.caption ? renderRichTextWithLinks(p.caption, S.chatSearchQuery) : ''}`;

    case 'video':
      if (m._uploadState) {
        return `<div class="media-slot wa-uploading-media">
          ${m._localPreviewUrl ? `<video class="media-img" src="${esc(m._localPreviewUrl)}#t=0.1" muted playsinline style="max-height:280px;object-fit:cover;opacity:${m._uploadState === 'failed' ? '0.45' : '0.72'}"></video>` : ''}
          <div class="wa-media-upload-overlay">
            ${m._uploadState === 'failed'
              ? `<button type="button" class="wa-upload-retry-btn pill-mode" data-retry-upload="${m.id}">${icon('refresh')} <span>Retry</span></button>`
              : renderUploadRingSVG(m._uploadPct)}
          </div>
        </div>${p.caption ? renderRichTextWithLinks(p.caption, S.chatSearchQuery) : ''}`;
      }
      return `<div class="media-slot" data-media="${m.id}" data-kind="video">
        <div class="file-card"><div class="file-ico">${icon('video')}</div><div class="file-info"><div class="file-name">${highlightMatches(p.name || 'Video', S.chatSearchQuery)}</div><div class="file-sub">${fmtBytes(p.size || 0)}</div></div></div>
      </div>${p.caption ? renderRichTextWithLinks(p.caption, S.chatSearchQuery) : ''}`;

    case 'file':
      if (m._uploadState) {
        const isFailed = m._uploadState === 'failed';
        return `<div class="file-card wa-upload-file-card ${isFailed ? 'is-failed' : ''}" data-upload-mid="${m.id}">
          <div class="file-ico ${isFailed ? 'is-failed' : ''}">${isFailed ? icon('alert') : renderUploadRingSVG(m._uploadPct)}</div>
          <div class="file-info">
            <div class="file-name">${highlightMatches(p.name || 'Attachment', S.chatSearchQuery)}</div>
            <div class="file-sub">${isFailed ? 'Upload failed' : `${fmtBytes(p.size || 0)} · Sending…`}</div>
          </div>
          ${isFailed ? `<button type="button" class="wa-upload-retry-btn" data-retry-upload="${m.id}">${icon('refresh')} <span>Retry</span></button>` : ''}
        </div>${p.caption ? renderRichTextWithLinks(p.caption, S.chatSearchQuery) : ''}`;
      }
      return `<div class="file-card" data-dl="${m.id}">
        <div class="file-ico">${icon('file')}</div>
        <div class="file-info">
          <div class="file-name">${highlightMatches(p.name || 'Attachment', S.chatSearchQuery)}</div>
          <div class="file-sub">${fmtBytes(p.size || 0)}</div>
          <div class="progress hidden" id="dlprog-${m.id}"><div></div></div>
        </div>
        <button class="icon-btn" title="Decrypt & download">${icon('download')}</button>
      </div>${p.caption ? renderRichTextWithLinks(p.caption, S.chatSearchQuery) : ''}`;

    case 'location':
    case 'live': {
      const coords = m._livePlain || p;
      const lat = Number(coords.lat) || 0, lng = Number(coords.lng) || 0;
      const bbox = `${lng - 0.008},${lat - 0.005},${lng + 0.008},${lat + 0.005}`;
      const isLive = m.kind === 'live' && !m.live?.ended && (m.live?.until || 0) > Date.now();
      return `<div class="loc-card">
        <div class="card-kicker">${isLive ? '<span class="live-dot"></span> LIVE LOCATION' : '📍 PINNED LOCATION'}</div>
        <div class="loc-map"><iframe loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}"></iframe></div>
        <div class="row between">
          <span style="font-size:12px;font-weight:600">${esc(p.label || `${lat.toFixed(4)}, ${lng.toFixed(4)}`)}</span>
          ${isLive && m.senderId === S.user.id ? `<button class="btn danger sm" data-stoplive="${m.id}">Stop</button>` : `<a class="btn ghost sm" target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}">Open map</a>`}
        </div>
      </div>`;
    }

    case 'poll': {
      const opts = p.options || [];
      const votes = m.votes || {};
      const total = Object.values(votes).reduce((s, arr) => s + arr.length, 0);
      return `<div class="poll-card">
        <div class="card-kicker">📊 ${m.pollMulti ? 'MULTIPLE CHOICE POLL' : 'POLL'} · ${total} vote${total === 1 ? '' : 's'}</div>
        <div class="card-title">${esc(p.question)}</div>
        ${opts.map((opt, idx) => {
          const v = votes[idx] || [];
          const pct = total ? Math.round((v.length / total) * 100) : 0;
          const mine = v.includes(S.user.id);
          return `<div class="poll-opt ${mine ? 'voted' : ''}" data-vote="${idx}" data-mid="${m.id}">
            <div class="poll-bar" style="width:${pct}%"></div>
            <div class="poll-opt-row"><span>${mine ? '✓ ' : ''}${esc(opt)}</span><span>${pct}% (${v.length})</span></div>
          </div>`;
        }).join('')}
      </div>`;
    }

    case 'todo': {
      const items = p.items || [];
      const checks = m.checks || {};
      const doneCount = items.filter(it => checks[it.id]).length;
      return `<div class="todo-card">
        <div class="card-kicker">✅ SHARED TO-DO · ${doneCount}/${items.length} done</div>
        <div class="card-title">${esc(p.title)}</div>
        ${items.map(it => {
          const ck = checks[it.id];
          const byName = ck ? (S.users.get(ck.by)?.name?.split(' ')[0] || 'done') : '';
          return `<div class="todo-item ${ck ? 'done' : ''}" data-check="${esc(it.id)}" data-mid="${m.id}">
            <div class="todo-box">${ck ? '✓' : ''}</div>
            <span class="todo-label" style="flex:1">${esc(it.text)}</span>
            ${byName ? `<small class="muted">${esc(byName)}</small>` : ''}
          </div>`;
        }).join('')}
      </div>`;
    }

    case 'music': {
      return `<div class="music-card">
        <div class="card-kicker" style="color:var(--brand)">🎵 MUSIC SHARE ${p.sharedBy ? `· ${esc(p.sharedBy)}` : ''}</div>
        <div class="music-top">
          ${p.artwork ? `<img class="music-art" src="${esc(p.artwork)}" alt="">` : `<div class="music-art"></div>`}
          <div class="music-meta">
            <div class="music-title">${esc(p.title)}</div>
            <div class="music-artist">${esc(p.artist || '')}</div>
          </div>
        </div>
        ${p.previewUrl ? renderCustomAudioPlayer(p.previewUrl, { isMusic: true, title: `${p.title} · ${p.artist || ''}` }) : ''}
      </div>`;
    }

    default:
      return renderRichTextWithLinks(p.text || '', S.chatSearchQuery);
  }
}

async function toggleReaction(mid, emoji) {
  try {
    SoundFX?.play('react');
    const c = S.chats.get(S.activeChatId);
    if (c) {
      const list = S.msgs.get(c.id) || [];
      const m = list.find(x => x.id === mid);
      if (m) {
        if (!m.reactions) m.reactions = {};
        const alreadyHad = (m.reactions[emoji] || []).includes(S.user.id);
        for (const k of Object.keys(m.reactions)) {
          m.reactions[k] = (m.reactions[k] || []).filter(u => u !== S.user.id);
          if (!m.reactions[k].length) delete m.reactions[k];
        }
        if (!alreadyHad) {
          m.reactions[emoji] = [...(m.reactions[emoji] || []), S.user.id];
        }
        updateMessageReactions(mid, m.reactions);
      }
    }
    await api(`/api/messages/${mid}/react`, { method: 'POST', body: { emoji } });
  } catch (err) {
    toast(err.message, 'err');
  }
}

function updateMessageReactions(mid, reactions) {
  const msgEl = document.getElementById(`m-${mid}`);
  if (!msgEl) return;
  const bubble = msgEl.querySelector('.bubble');
  if (!bubble) return;

  const reacts = Object.entries(reactions || {});
  let reactWrap = bubble.querySelector('.reactions');

  if (!reacts.length) {
    if (reactWrap) reactWrap.remove();
    return;
  }

  const html = reacts.map(([em, uids]) =>
    `<span class="react-chip ${uids.includes(S.user.id) ? 'mine' : ''}" data-react="${esc(em)}" data-mid="${mid}">${esc(em)} <b>${uids.length}</b></span>`
  ).join('');

  if (reactWrap) {
    reactWrap.innerHTML = html;
  } else {
    reactWrap = document.createElement('div');
    reactWrap.className = 'reactions';
    reactWrap.innerHTML = html;
    bubble.appendChild(reactWrap);
  }

  reactWrap.querySelectorAll('[data-react]').forEach(chip => {
    chip.onclick = e => {
      e.stopPropagation();
      toggleReaction(chip.dataset.mid, chip.dataset.react);
    };
  });
}

function updateMessageDOM(m, c) {
  const el = document.getElementById(`m-${m.id}`);
  if (!el) return false;

  if (m.deleted || m.deletedForEveryone) return false;
  if (m.edited) return false;

  updateMessageReactions(m.id, m.reactions);

  // Dynamically update real-time Shared To-Do and Poll cards
  if (m.kind === 'todo' || m.kind === 'poll') {
    const existingCard = el.querySelector(m.kind === 'todo' ? '.todo-card' : '.poll-card');
    if (existingCard) {
      const temp = document.createElement('div');
      temp.innerHTML = renderMsgBody(c, m);
      const newCard = temp.firstElementChild;
      if (newCard) {
        existingCard.replaceWith(newCard);
        if (m.kind === 'todo') {
          $$('[data-check]', newCard).forEach(itemEl => {
            itemEl.onclick = e => {
              e.stopPropagation();
              handleTodoCheck(itemEl, c);
            };
          });
        } else if (m.kind === 'poll') {
          $$('[data-vote]', newCard).forEach(voteEl => {
            voteEl.onclick = e => {
              e.stopPropagation();
              api(`/api/messages/${voteEl.dataset.mid}/vote`, { method: 'POST', body: { option: +voteEl.dataset.vote } });
            };
          });
        }
      }
    }
  }

  const meta = el.querySelector('.msg-meta');
  if (meta) {
    const out = m.senderId === S.user.id;
    const readCount = (m.readBy || []).filter(u => u !== m.senderId).length;
    const metaRight = c.type === 'channel'
      ? `<span>👁️ ${m.views || 1}</span>`
      : (out ? `<span class="checks ${readCount ? 'read' : ''}">${readCount ? '✓✓' : '✓'}</span>` : '');
    const isStarred = (m.starredBy || []).includes(S.user.id);
    const starBadge = isStarred ? `<span class="star-badge" title="Starred">${icon('starFill')}</span>` : '';
    meta.innerHTML = `<span>${fmtTime(m.ts)}</span>${metaRight}${starBadge}`;
  }

  return true;
}

function handleTodoCheck(el, chat) {
  const mid = el.dataset.mid;
  const itemId = el.dataset.check;
  const c = chat || S.chats.get(S.activeChatId);
  const list = c ? (S.msgs.get(c.id) || []) : [];
  const m = list.find(x => x.id === mid);
  if (!m) return;
  if (!m.checks || typeof m.checks !== 'object') m.checks = {};

  const wasDone = Boolean(m.checks[itemId]);
  if (wasDone) {
    delete m.checks[itemId];
  } else {
    m.checks[itemId] = { by: S.user.id, at: Date.now() };
  }

  // Instant optimistic feedback in DOM
  el.classList.toggle('done', !wasDone);
  const box = el.querySelector('.todo-box');
  if (box) box.textContent = !wasDone ? '✓' : '';

  const card = el.closest('.todo-card');
  if (card) {
    const items = (m._plain || m.body || {}).items || [];
    const doneCount = items.filter(it => m.checks[it.id]).length;
    const kicker = card.querySelector('.card-kicker');
    if (kicker) kicker.textContent = `✅ SHARED TO-DO · ${doneCount}/${items.length} done`;

    let bySmall = el.querySelector('small.muted');
    if (!wasDone) {
      const myName = S.user?.name?.split(' ')[0] || 'done';
      if (!bySmall) {
        bySmall = document.createElement('small');
        bySmall.className = 'muted';
        el.appendChild(bySmall);
      }
      bySmall.textContent = myName;
    } else if (bySmall) {
      bySmall.remove();
    }
  }

  SoundFX?.play('react');

  // Background broadcast sync
  api(`/api/messages/${mid}/check`, { method: 'POST', body: { itemId } }).catch(() => {
    if (wasDone) m.checks[itemId] = { by: S.user.id, at: Date.now() };
    else delete m.checks[itemId];
    if (c) updateMessageDOM(m, c);
    toast('Failed to update to-do item', 'err');
  });
}

let activeReactionPicker = null;

function closeReactionEmojiPicker() {
  if (activeReactionPicker) {
    activeReactionPicker.remove();
    activeReactionPicker = null;
    document.removeEventListener('click', onReactionPickerDocClick, true);
    document.removeEventListener('keydown', onReactionPickerDocKey);
  }
}

function onReactionPickerDocClick(e) {
  if (activeReactionPicker && !activeReactionPicker.contains(e.target) && !e.target.closest('[data-react-more]')) {
    closeReactionEmojiPicker();
  }
}

function onReactionPickerDocKey(e) {
  if (e.key === 'Escape') {
    closeReactionEmojiPicker();
  }
}

function openReactionEmojiPicker(mid, anchorEl) {
  closeReactionEmojiPicker();
  if (!mid || !anchorEl) return;

  const rect = anchorEl.getBoundingClientRect();
  const picker = document.createElement('div');
  picker.id = 'waReactionEmojiPicker';
  picker.className = 'wa-reaction-picker-popup';

  let currentCategory = 'all';
  let searchQuery = '';

  const renderPicker = () => {
    let list = [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      FULL_EMOJIS_LIST.forEach(item => {
        if (item.tags.some(t => t.includes(q)) || item.name.toLowerCase().includes(q) || item.emoji === q) {
          list.push(item);
        }
      });
    } else if (currentCategory === 'all') {
      list = FULL_EMOJIS_LIST;
    } else {
      list = FULL_EMOJIS_LIST.filter(item => item.category === currentCategory);
    }

    picker.innerHTML = `
      <div class="wa-ep-header">
        <div class="wa-ep-search-wrap">
          <svg class="wa-ep-search-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" class="wa-ep-search-in" placeholder="Search emojis…" value="${esc(searchQuery)}" autofocus>
          ${searchQuery ? `<button type="button" class="wa-ep-search-clear" title="Clear">✕</button>` : ''}
        </div>
      </div>

      <div class="wa-ep-categories">
        ${EMOJI_CATEGORY_TABS.map(cat => `
          <button type="button" class="wa-ep-cat-btn ${currentCategory === cat.id && !searchQuery ? 'active' : ''}" data-cat="${cat.id}" title="${cat.label}">
            <span>${cat.icon}</span>
          </button>
        `).join('')}
      </div>

      <div class="wa-ep-grid-wrap">
        ${list.length ? `
          <div class="wa-ep-grid">
            ${list.map(item => `
              <button type="button" class="wa-ep-cell" data-react-emoji="${item.emoji}" title="${esc(item.name)}">
                ${item.emoji}
              </button>
            `).join('')}
          </div>
        ` : `
          <div class="wa-ep-empty">No matching emojis found</div>
        `}
      </div>
    `;

    bindEvents();
  };

  const bindEvents = () => {
    const searchIn = picker.querySelector('.wa-ep-search-in');
    if (searchIn) {
      searchIn.oninput = e => {
        searchQuery = e.target.value;
        renderPicker();
        // Restore cursor & focus
        const newIn = picker.querySelector('.wa-ep-search-in');
        if (newIn) {
          newIn.focus();
          newIn.setSelectionRange(newIn.value.length, newIn.value.length);
        }
      };
    }

    const clearBtn = picker.querySelector('.wa-ep-search-clear');
    if (clearBtn) {
      clearBtn.onclick = () => {
        searchQuery = '';
        renderPicker();
      };
    }

    picker.querySelectorAll('.wa-ep-cat-btn').forEach(btn => {
      btn.onclick = () => {
        currentCategory = btn.dataset.cat;
        searchQuery = '';
        renderPicker();
      };
    });

    picker.querySelectorAll('[data-react-emoji]').forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        const emoji = btn.dataset.reactEmoji;
        toggleReaction(mid, emoji);
        closeReactionEmojiPicker();
      };
    });
  };

  renderPicker();
  document.body.appendChild(picker);
  activeReactionPicker = picker;

  // Positioning
  const pWidth = 320;
  const pHeight = 360;
  let top = rect.top - pHeight - 10;
  if (top < 10) {
    top = rect.bottom + 10;
  }
  let left = rect.left - 130;
  if (left < 10) left = 10;
  if (left + pWidth > window.innerWidth - 10) {
    left = window.innerWidth - pWidth - 10;
  }
  picker.style.top = `${top}px`;
  picker.style.left = `${left}px`;

  setTimeout(() => {
    document.addEventListener('click', onReactionPickerDocClick, true);
    document.addEventListener('keydown', onReactionPickerDocKey);
  }, 50);
}

function bindMessageInteractions(root, chat) {
  // Rich external links & YouTube inline player
  $$('[data-extlink]', root).forEach(link => {
    link.onclick = e => {
      e.stopPropagation();
      const url = link.dataset.extlink || link.getAttribute('href');
      if (!url) return;
      if (window.fireuppNative && typeof window.fireuppNative.openExternal === 'function') {
        e.preventDefault();
        window.fireuppNative.openExternal(url);
      }
    };
  });

  $$('[data-ytplay]', root).forEach(wrap => {
    wrap.onclick = e => {
      e.stopPropagation();
      const ytId = wrap.dataset.ytplay;
      if (!ytId) return;
      const card = wrap.closest('.msg-yt-card');
      if (card) {
        const hint = card.querySelector('.msg-yt-hint');
        if (hint) hint.textContent = 'Playing inline';
      }
      wrap.outerHTML = `
        <div class="msg-yt-iframe-wrap">
          <iframe class="msg-yt-iframe" src="https://www.youtube.com/embed/${esc(ytId)}?autoplay=1&rel=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
        </div>
      `;
    };
  });

  // Call back button on WhatsApp-style in-chat call events
  $$('.msg-call-back-btn', root).forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      const mode = btn.dataset.callmode || 'audio';
      const c = chat || (S.activeChatId ? S.chats.get(S.activeChatId) : null);
      if (c && typeof startChatCall === 'function') startChatCall(c, mode);
    };
  });

  $$('[data-react]', root).forEach(el => el.onclick = e => {
    e.stopPropagation();
    toggleReaction(el.dataset.mid, el.dataset.react);
  });

  $$('[data-react-more]', root).forEach(el => el.onclick = e => {
    e.stopPropagation();
    openReactionEmojiPicker(el.dataset.reactMore, el);
  });

  // Album item click -> opens lightbox
  $$('.wa-album-item', root).forEach(el => {
    el.onclick = e => {
      e.stopPropagation();
      openWhatsAppMediaLightbox(el.dataset.mid);
    };
    el.oncontextmenu = e => {
      e.preventDefault();
      e.stopPropagation();
      if (S.msgSelectMode) return;
      openMessageContextMenu(el, el.dataset.mid, e);
    };
  });

  // Sticker item in group right click -> context menu for individual sticker
  $$('.wa-sticker-item', root).forEach(el => {
    el.oncontextmenu = e => {
      e.preventDefault();
      e.stopPropagation();
      if (S.msgSelectMode) return;
      openMessageContextMenu(el, el.dataset.mid, e);
    };
  });

  // Message Click & Right Click Context Menu
  $$('.msg', root).forEach(el => {
    el.onclick = e => {
      if (S.msgSelectMode) {
        e.stopPropagation();
        toggleMessageSelection(el.dataset.mid);
      }
    };
    el.oncontextmenu = e => {
      e.preventDefault();
      e.stopPropagation();
      if (S.msgSelectMode) return;
      openMessageContextMenu(el, el.dataset.mid, e);
    };
  });
  $$('[data-sel]', root).forEach(el => el.onclick = e => {
    e.stopPropagation();
    toggleMessageSelection(el.dataset.sel);
  });
  $$('[data-star]', root).forEach(el => el.onclick = e => { e.stopPropagation(); toggleStarMessage(el.dataset.star); });
  $$('[data-pin]', root).forEach(el => el.onclick = e => { e.stopPropagation(); togglePinMessage(el.dataset.pin); });
  $$('[data-translate]', root).forEach(el => el.onclick = e => { e.stopPropagation(); translateMessage(el.dataset.translate); });
  $$('.msg-trans-select', root).forEach(el => el.onchange = e => {
    e.stopPropagation();
    translateMessage(el.dataset.mid, el.value);
  });
  $$('[data-trans-to]', root).forEach(el => el.onclick = e => {
    e.stopPropagation();
    translateMessage(el.dataset.mid, el.dataset.transTo);
  });
  $$('[data-hidetranslate]', root).forEach(el => el.onclick = e => {
    e.stopPropagation();
    const list = S.msgs.get(S.activeChatId) || [];
    const m = list.find(x => x.id === el.dataset.hidetranslate);
    if (m) { m._showTranslation = false; renderMessages(); }
  });
  $$('[data-reply]', root).forEach(el => el.onclick = () => setReplyTo(el.dataset.reply));
  $$('[data-delbtn]', root).forEach(el => el.onclick = e => {
    e.stopPropagation();
    openDeleteMenu(el, el.dataset.delbtn);
  });
  $$('[data-del]', root).forEach(el => el.onclick = () => api(`/api/messages/${el.dataset.del}`, { method: 'DELETE' }));
  $$('[data-jump]', root).forEach(el => el.onclick = () => {
    const t = $(`#m-${el.dataset.jump}`);
    if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  $$('[data-vote]', root).forEach(el => el.onclick = () =>
    api(`/api/messages/${el.dataset.mid}/vote`, { method: 'POST', body: { option: +el.dataset.vote } })
  );
  $$('[data-check]', root).forEach(el => el.onclick = (e) => {
    e.stopPropagation();
    handleTodoCheck(el, chat);
  });
  $$('[data-stoplive]', root).forEach(el => el.onclick = () => stopLiveLocation(el.dataset.stoplive));
  $$('[data-dl]', root).forEach(el => el.onclick = () => downloadAttachment(chat, el.dataset.dl));
  $$('[data-vo]', root).forEach(el => el.onclick = () => openViewOnce(chat, el.dataset.vo));
  $$('[data-retry-upload]', root).forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      const mid = btn.dataset.retryUpload;
      const pending = window._pendingUploadMap?.get(mid);
      if (pending && pending._retryFile) {
        uploadEncryptedFile(pending._retryFile, {
          ...(pending._retryOpts || {}),
          existingTempId: mid,
          targetChatId: pending.chatId
        });
      }
    };
  });

  // Auto-decrypt inline images, voice notes, and videos
  $$('[data-media]', root).forEach(el => autoRenderInlineMedia(chat, el.dataset.media, el.dataset.kind, el));
  initCustomAudioPlayers(root);
  initCustomVideoPlayers(root);
}

function setReplyTo(mid) {
  const list = S.msgs.get(S.activeChatId) || [];
  const m = list.find(x => x.id === mid);
  if (!m) return;
  S.replyTo = m.id;
  const bar = $('#replyBar');
  if (!bar) return;
  bar.classList.remove('hidden');
  bar.innerHTML = `<div><strong>Replying</strong>: ${esc(msgPreviewText(m).slice(0, 70))}</div><button class="icon-btn" id="cancelReply">${icon('close')}</button>`;
  $('#cancelReply').onclick = () => { S.replyTo = null; bar.classList.add('hidden'); };
  $('#msgInput')?.focus();
}

async function onIncomingMessage(m, isNew) {
  const c = S.chats.get(m.chatId);
  if (!c) return;
  await decryptMsg(c, m);
  let list = S.msgs.get(c.id) || [];

  // Reconcile optimistic pending upload bubble when real server/WS message lands
  if (m.senderId === S.user?.id && m._plain?.fileId && window._pendingUploadMap?.size) {
    for (const [tid, pending] of window._pendingUploadMap.entries()) {
      if (pending.chatId === c.id && pending._serverFileId === m._plain.fileId) {
        if (pending._localPreviewUrl && !m.viewOnce && !blobCache.has(m.id)) {
          blobCache.set(m.id, pending._localPreviewUrl);
        }
        list = list.filter(x => x.id !== tid);
        window._pendingUploadMap.delete(tid);
      }
    }
  }

  const idx = list.findIndex(x => x.id === m.id);

  if (idx >= 0) {
    list[idx] = m;
    S.msgs.set(c.id, list);
    if (window.ZovioLocalDB && S.user?.id) {
      ZovioLocalDB.saveChatMessages(S.user.id, c.id, list).catch(() => {});
    }
    if (S.activeChatId === c.id) {
      updateMessageDOM(m, c);
      updateInfoPaneCounters(c.id);
    }
    return;
  }

  if (isNew) list.push(m);
  S.msgs.set(c.id, list);
  if (window.ZovioLocalDB && S.user?.id) {
    ZovioLocalDB.saveChatMessages(S.user.id, c.id, list).catch(() => {});
  }
  if (isNew) scheduleAutoCacheChatMedia([m]);

  if (isNew) {
    c.lastMessage = m;
    c.updatedAt = m.ts;
    const canAutoRead = S.activeChatId === c.id &&
                        document.hasFocus() &&
                        !document.hidden &&
                        (typeof isAppPresenceActive !== 'function' || isAppPresenceActive());
    if (canAutoRead) {
      c.unread = 0;
      if (S.user?.preferences?.readReceipts !== false) {
        api(`/api/chats/${c.id}/read`, { method: 'POST' }).catch(() => {});
      }
    } else if (m.senderId !== S.user.id && m.kind !== 'system') {
      c.unread = (c.unread || 0) + 1;
    }
    if (m.senderId !== S.user.id && m.kind !== 'system' && !isChatMuted(c.id)) {
      SoundFX?.play('receive');
    }
    // Desktop Notification (WhatsApp Desktop style)
    if (m.senderId !== S.user.id && m.kind !== 'system') {
      if (document.hidden || !document.hasFocus() || S.activeChatId !== c.id) {
        const sender = S.users.get(m.senderId);
        const senderName = sender?.name || (c.type === 'dm' ? (c.name || 'Contact') : 'Someone');
        const notifTitle = c.type === 'dm' ? senderName : `${senderName} (${c.name || 'Group'})`;
        let snippet = 'New message';
        const plainTxt = m._plain?.text || m.decryptedText || (typeof m.text === 'string' ? m.text : '');
        if (m.kind === 'photo' || m.kind === 'image') snippet = 'Photo';
        else if (m.kind === 'audio' || m.kind === 'voice') snippet = 'Voice note';
        else if (m.kind === 'video') snippet = 'Video';
        else if (m.kind === 'file') snippet = 'Attachment';
        else if (plainTxt) snippet = plainTxt.slice(0, 120);

        if (typeof window.showDesktopNotification === 'function') {
          window.showDesktopNotification(notifTitle, {
            chatId: c.id,
            body: snippet,
            tag: `chat-${c.id}`,
            onClick: () => {
              if (typeof openChat === 'function') openChat(c.id);
            }
          });
        }
      }
    }
  }
  renderChatList();
  if (S.activeChatId === c.id) {
    if (isNew && m.senderId !== S.user?.id && m.kind !== 'system') {
      resetTypingSub();
    }
    if (isNew) {
      const sc = $('#msgsScroll');
      const distFromBottom = sc ? (sc.scrollHeight - sc.scrollTop - sc.clientHeight) : 0;
      const isMyMessage = m.senderId === S.user.id;
      const wasNearBottom = !S.userScrolledUp && distFromBottom <= 180;

      if (isMyMessage || wasNearBottom) {
        // Current user sent message or was already at the bottom -> scroll to reveal new message
        S.userScrolledUp = false;
        renderMessages('bottom');
        scrollToBottom(true);
      } else {
        // User has scrolled up to inspect previous messages -> preserve view, alert with badge
        if (m.kind !== 'system') {
          const badge = $('#scrollBottomBadge');
          if (badge) {
            const count = (parseInt(badge.textContent, 10) || 0) + 1;
            badge.textContent = count > 99 ? '99+' : count;
            badge.classList.remove('hidden');
          }
          $('#scrollBottomBtn')?.classList.remove('hidden');
        }
        renderMessages('preserve');
      }
    } else {
      const updated = updateMessageDOM(m, c);
      if (!updated) {
        renderMessages('preserve');
      }
    }
    updateInfoPaneCounters(c.id);
  }
}

// ---------------- Sending Encrypted Payloads ----------------
async function sendChatPayload(kind, plainObj, extra = {}) {
  const c = S.chats.get(S.activeChatId);
  if (!c) return;
  const body = { kind, replyTo: S.replyTo, ...extra };
  if (c.type === 'channel') {
    body.body = plainObj;
  } else {
    const key = await getChatKey(c, c.keyVersion || 1);
    const box = await E2E.encryptJSON(key, plainObj);
    body.iv = box.iv;
    body.ct = box.ct;
    body.keyVersion = c.keyVersion || 1;
  }
  S.replyTo = null;
  $('#replyBar')?.classList.add('hidden');
  const res = await api(`/api/chats/${c.id}/messages`, { method: 'POST', body });
  SoundFX?.play('send');
  if (res && res.id) {
    await onIncomingMessage(res, true);
  }
  return res;
}
async function sendQuickReplyFromNotification(chatId, text) {
  const c = S.chats.get(chatId);
  const cleanText = String(text || '').trim();
  if (!c || !cleanText) return;
  try {
    const body = { kind: 'text' };
    if (c.type === 'channel') {
      body.body = { text: cleanText };
    } else {
      const key = await getChatKey(c, c.keyVersion || 1);
      const box = await E2E.encryptJSON(key, { text: cleanText });
      body.iv = box.iv;
      body.ct = box.ct;
      body.keyVersion = c.keyVersion || 1;
    }
    const res = await api(`/api/chats/${c.id}/messages`, { method: 'POST', body });
    SoundFX?.play('send');
    if (res && res.id) {
      await onIncomingMessage(res, true);
    }
    api(`/api/chats/${c.id}/read`, { method: 'POST' }).catch(() => {});
  } catch (err) {
    toast('Quick reply failed: ' + (err?.message || 'Error'), 'err');
  }
}
window.sendQuickReplyFromNotification = sendQuickReplyFromNotification;

function showInAppQuickReplyToast({ chatId, title, body }) {
  document.getElementById('zovioQuickReplyToast')?.remove();
  const el = document.createElement('div');
  el.id = 'zovioQuickReplyToast';
  el.className = 'zovio-qr-toast';
  const initial = esc((title || 'Z').trim().charAt(0).toUpperCase());
  el.innerHTML = `
    <div class="zovio-qr-head">
      <div class="zovio-qr-ava">${initial}</div>
      <div class="zovio-qr-meta">
        <div class="zovio-qr-name">${esc(title || 'Zovio')}</div>
        <div class="zovio-qr-body">${esc(body || 'New message')}</div>
      </div>
      <button type="button" class="icon-btn xs zovio-qr-close" title="Dismiss">${icon('close')}</button>
    </div>
    <form class="zovio-qr-form">
      <input type="text" class="zovio-qr-input" placeholder="Reply to ${esc(title || 'message')}..." autocomplete="off">
      <button type="submit" class="zovio-qr-send">Send</button>
    </form>
  `;
  document.body.appendChild(el);

  let timer = setTimeout(() => el.remove(), 8000);
  const inp = el.querySelector('.zovio-qr-input');
  inp?.addEventListener('focus', () => clearTimeout(timer));
  el.querySelector('.zovio-qr-close')?.addEventListener('click', (e) => {
    e.stopPropagation();
    clearTimeout(timer);
    el.remove();
  });
  el.querySelector('.zovio-qr-head')?.addEventListener('click', () => {
    clearTimeout(timer);
    el.remove();
    if (chatId && typeof openChat === 'function') openChat(chatId);
  });
  el.querySelector('.zovio-qr-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const val = inp?.value.trim();
    if (!val) return;
    clearTimeout(timer);
    el.remove();
    await sendQuickReplyFromNotification(chatId, val);
  });
}
window.showInAppQuickReplyToast = showInAppQuickReplyToast;

window.sendChatPayload = sendChatPayload;

async function sendTextMessage() {
  const inp = $('#msgInput');
  const text = inp?.value.trim();
  if (!text) return;

  if (S.editingMsg) {
    const editing = S.editingMsg;
    const fifteenMinutes = 15 * 60 * 1000;
    if (Date.now() - editing.ts > fifteenMinutes) {
      cancelEditMessage();
      return toast('Messages can only be edited within 15 minutes of sending', 'err');
    }
    inp.value = '';
    inp.style.height = 'auto';
    cancelEditMessage();
    try {
      const c = S.chats.get(S.activeChatId);
      let payload = {};
      if (c.type === 'channel') {
        payload = { body: { text } };
      } else {
        const key = await getChatKey(c, editing.keyVersion || c.keyVersion || 1);
        const enc = await E2E.encryptJSON(key, { text });
        payload = { iv: enc.iv, ct: enc.ct, keyVersion: editing.keyVersion || c.keyVersion || 1 };
      }
      await api(`/api/messages/${editing.id}/edit`, { method: 'POST', body: payload });
      editing._plain = { ...(editing._plain || {}), text };
      editing.edited = true;
      editing.editedAt = Date.now();
      renderMessages('preserve');
    } catch (e) {
      toast(e.message || 'Could not edit message', 'err');
    }
    return;
  }

  const wasFocused = document.activeElement === inp;
  inp.value = '';
  inp.style.height = 'auto';
  if (wasFocused) {
    try { inp.focus({ preventScroll: true }); } catch {}
  }
  if (S.ws?.readyState === 1 && S.activeChatId) {
    try { S.ws.send(JSON.stringify({ type: 'typing', chatId: S.activeChatId, on: false })); } catch {}
  }
  try {
    await sendChatPayload('text', { text });
  } catch (e) {
    toast(e.message, 'err');
  }
  if (wasFocused && document.activeElement !== inp) {
    try { inp.focus({ preventScroll: true }); } catch {}
  }
}

// ---------------- Chunked Encrypted Large File, One-View Photo/Video & Voice ----------------
const blobCache = new Map(); // msgId -> objectURL

function uploadChunkWithProgress(url, bytes, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.timeout = 45000;
    if (S.token) xhr.setRequestHeader('Authorization', `Bearer ${S.token}`);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    if (xhr.upload && typeof onProgress === 'function') {
      xhr.upload.onprogress = e => {
        if (e.lengthComputable && e.total > 0) {
          onProgress(Math.min(1, e.loaded / e.total));
        }
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(xhr.responseText ? JSON.parse(xhr.responseText) : { ok: true });
        } catch {
          resolve({ ok: true });
        }
      } else {
        let msg = xhr.statusText || `Upload failed (${xhr.status})`;
        try {
          const parsed = JSON.parse(xhr.responseText || '{}');
          if (parsed.error) msg = parsed.error;
        } catch {}
        const err = new Error(msg);
        err.status = xhr.status;
        reject(err);
      }
    };
    xhr.onerror = () => reject(new Error('Network error while uploading chunk'));
    xhr.ontimeout = () => reject(new Error('Upload timed out — tap Retry'));
    xhr.onabort = () => reject(new Error('Upload canceled'));
    xhr.send(bytes);
  });
}

if (!window._pendingUploadMap) window._pendingUploadMap = new Map();

function updatePendingUploadRingDOM(tempId, pct) {
  const el = document.getElementById(`m-${tempId}`);
  if (!el) return;
  const clamped = Math.max(2, Math.min(100, Math.round(pct)));
  const circ = 94.25;
  const arc = el.querySelector('.wa-upload-ring-arc');
  if (arc) arc.setAttribute('stroke-dashoffset', (circ * (1 - clamped / 100)).toFixed(1));
  const pctEl = el.querySelector('.wa-upload-pct');
  if (pctEl) pctEl.textContent = `${clamped}%`;
}

async function uploadMultipleEncryptedFiles(files, opts = {}) {
  const list = Array.from(files || []).filter(Boolean);
  if (!list.length) return;
  const targetChatId = opts.targetChatId || S.activeChatId;
  const concurrency = Math.min(3, list.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (cursor < list.length) {
        const f = list[cursor++];
        await uploadEncryptedFile(f, { ...opts, targetChatId });
      }
    })
  );
}

async function uploadEncryptedFile(file, { viewOnce = false, caption = '', duration = 0, existingTempId = null, targetChatId = null } = {}) {
  const cid = targetChatId || S.activeChatId;
  const c = S.chats.get(cid);
  if (!c) return;
  if (!file || !file.size) return toast('Selected file is empty', 'err');
  const chunkSize = S.config.chunkSize || (1536 * 1024);
  const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));
  const mime = file.type || 'application/octet-stream';
  const kind = mime.startsWith('video/')
    ? 'video'
    : mime.startsWith('image/')
      ? 'image'
      : mime.startsWith('audio/')
        ? 'audio'
        : (viewOnce ? 'image' : 'file');

  const tempId = existingTempId || `temp_up_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  let tempMsg = window._pendingUploadMap.get(tempId);
  const list = S.msgs.get(c.id) || [];

  if (!tempMsg) {
    const canPreview = !viewOnce && (kind === 'image' || kind === 'video');
    tempMsg = {
      id: tempId,
      chatId: c.id,
      senderId: S.user.id,
      ts: Date.now(),
      kind,
      viewOnce: Boolean(viewOnce),
      _plain: { name: file.name, mime, size: file.size, caption, duration: duration || file._duration || 0 },
      _uploadState: 'uploading',
      _uploadPct: 2,
      _localPreviewUrl: canPreview ? URL.createObjectURL(file) : '',
      _retryFile: file,
      _retryOpts: { viewOnce, caption, duration }
    };
    window._pendingUploadMap.set(tempId, tempMsg);
    list.push(tempMsg);
    S.msgs.set(c.id, list);
  } else {
    tempMsg._uploadState = 'uploading';
    tempMsg._uploadPct = 2;
    tempMsg._uploadError = '';
  }

  if (S.activeChatId === c.id) {
    renderMessages(existingTempId ? 'preserve' : 'bottom');
  }

  try {
    const fileKeyRaw = E2E.newKeyRaw();
    const fileKey = await E2E.importKey(fileKeyRaw);
    const { id: fileId } = await api('/api/files', {
      method: 'POST',
      body: { chatId: c.id, size: file.size, chunks: totalChunks, viewOnce }
    });
    tempMsg._serverFileId = fileId;

    const chunkLoaded = new Array(totalChunks).fill(0);
    const updateAggProgress = () => {
      const doneBytes = chunkLoaded.reduce((s, v) => s + v, 0);
      const pct = Math.min(99, Math.max(2, Math.round((doneBytes / file.size) * 100)));
      tempMsg._uploadPct = pct;
      updatePendingUploadRingDOM(tempId, pct);
    };

    const workerCount = Math.min(3, totalChunks);
    let nextIdx = 0;
    await Promise.all(
      Array.from({ length: workerCount }, async () => {
        while (nextIdx < totalChunks) {
          const n = nextIdx++;
          const start = n * chunkSize;
          const end = Math.min(file.size, (n + 1) * chunkSize);
          const sliceLen = Math.max(1, end - start);
          const plainBytes = new Uint8Array(await file.slice(start, end).arrayBuffer());
          const sealed = await E2E.encryptChunk(fileKey, plainBytes);
          await uploadChunkWithProgress(`/api/files/${fileId}/${n}`, sealed, frac => {
            chunkLoaded[n] = sliceLen * frac * 0.96;
            updateAggProgress();
          });
          chunkLoaded[n] = sliceLen;
          updateAggProgress();
        }
      })
    );

    await api(`/api/files/${fileId}/complete`, { method: 'POST' });
    tempMsg._uploadPct = 100;
    updatePendingUploadRingDOM(tempId, 100);

    if (!viewOnce && window.ZovioLocalDB) {
      ZovioLocalDB.putMedia(fileId, {
        uid: S.user?.id,
        chatId: c.id,
        mime,
        name: file.name,
        size: file.size,
        blob: file
      }).catch(() => {});
    }

    const bodyObj = {
      kind,
      replyTo: S.replyTo,
      viewOnce,
      fileIds: [fileId]
    };
    const plainPayload = {
      fileId,
      fileKey: fileKeyRaw,
      name: file.name,
      mime,
      size: file.size,
      chunks: totalChunks,
      caption,
      duration: duration || file._duration || 0
    };
    if (c.type === 'channel') {
      bodyObj.body = plainPayload;
    } else {
      const key = await getChatKey(c, c.keyVersion || 1);
      const box = await E2E.encryptJSON(key, plainPayload);
      bodyObj.iv = box.iv;
      bodyObj.ct = box.ct;
      bodyObj.keyVersion = c.keyVersion || 1;
    }
    S.replyTo = null;
    $('#replyBar')?.classList.add('hidden');
    const res = await api(`/api/chats/${c.id}/messages`, { method: 'POST', body: bodyObj });
    SoundFX?.play('send');
    if (res && res.id) {
      if (tempMsg._localPreviewUrl && !viewOnce && !blobCache.has(res.id)) {
        blobCache.set(res.id, tempMsg._localPreviewUrl);
      }
      await onIncomingMessage(res, true);
    }
    if (window._pendingUploadMap.has(tempId)) {
      const cur = S.msgs.get(c.id) || [];
      S.msgs.set(c.id, cur.filter(x => x.id !== tempId));
      window._pendingUploadMap.delete(tempId);
      if (S.activeChatId === c.id) renderMessages('preserve');
    }
  } catch (e) {
    tempMsg._uploadState = 'failed';
    tempMsg._uploadError = e?.message || 'Upload failed';
    if (S.activeChatId === c.id) renderMessages('preserve');

    if (e?.status === 402 || e?.code === 'QUOTA_EXCEEDED' || /quota/i.test(e?.message || '')) {
      if (!viewOnce && window.ZovioLocalDB) {
        const localFileId = `f_local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        await ZovioLocalDB.putMedia(localFileId, {
          uid: S.user?.id,
          chatId: c.id,
          mime,
          name: file.name,
          size: file.size,
          blob: file
        }).catch(() => {});
        window.ZovioDriveBackup?.maybeRunScheduledBackup?.();
        toast('Saved to local device cache.', 'warn');
      }
    }
  }
}

const _inflightMediaDownloads = new Map();
const AUTO_CACHE_MAX_BYTES = 25 * 1024 * 1024;
let _autoCacheRunning = false;
const _autoCacheQueue = [];

function scheduleAutoCacheChatMedia(messages) {
  if (!window.ZovioLocalDB || !Array.isArray(messages) || !messages.length) return;
  for (const m of messages) {
    const p = m?._plain || m?.body;
    if (!m || m.deleted || m.deletedForEveryone || m.viewOnce || !p?.fileId) continue;
    if (blobCache.has(m.id)) continue;
    if ((p.size || 0) > AUTO_CACHE_MAX_BYTES) continue;
    _autoCacheQueue.push(m);
  }
  if (_autoCacheRunning || !_autoCacheQueue.length) return;
  _autoCacheRunning = true;
  const drain = async () => {
    try {
      while (_autoCacheQueue.length) {
        const nextMsg = _autoCacheQueue.shift();
        const p = nextMsg?._plain || nextMsg?.body;
        if (!p?.fileId || blobCache.has(nextMsg.id)) continue;
        await fetchDecryptedBlob(nextMsg).catch(() => {});
        await new Promise(r => setTimeout(r, 80));
      }
    } finally {
      _autoCacheRunning = false;
    }
  };
  setTimeout(drain, 150);
}

async function fetchDecryptedBlob(m, onProgress) {
  if (blobCache.has(m.id)) return blobCache.get(m.id);
  const p = m._plain || m.body || {};
  if (!p.fileId) throw new Error('Missing file reference');

  const inflightKey = m.viewOnce ? `vo:${m.id}` : `f:${p.fileId}`;
  if (_inflightMediaDownloads.has(inflightKey)) {
    return _inflightMediaDownloads.get(inflightKey);
  }

  const job = (async () => {
    if (!m.viewOnce && window.ZovioLocalDB) {
      const localRec = await ZovioLocalDB.getMedia(p.fileId).catch(() => null);
      if (localRec?.blob) {
        const localUrl = URL.createObjectURL(localRec.blob);
        blobCache.set(m.id, localUrl);
        return localUrl;
      }
    }

    const fileKey = await E2E.importKey(p.fileKey);
    const parts = [];
    let blob = null;
    try {
      for (let n = 0; n < (p.chunks || 1); n++) {
        let encBuf;
        try {
          encBuf = await api(`/api/files/${p.fileId}/${n}`, { raw: true });
        } catch (firstErr) {
          if (firstErr?.status === 410 || firstErr?.status === 404) throw firstErr;
          await new Promise(r => setTimeout(r, 800));
          encBuf = await api(`/api/files/${p.fileId}/${n}`, { raw: true });
        }
        parts.push(await E2E.decryptChunk(fileKey, encBuf));
        if (onProgress) onProgress(Math.round(((n + 1) / (p.chunks || 1)) * 100));
      }
      blob = new Blob(parts, { type: p.mime || 'application/octet-stream' });
    } catch (relayErr) {
      if (!m.viewOnce && window.ZovioDriveBackup?.restoreSingleFile) {
        const driveBlob = await window.ZovioDriveBackup.restoreSingleFile(p.fileId).catch(() => null);
        if (driveBlob) blob = driveBlob;
      }
      if (!blob) throw relayErr;
    }
    if (!m.viewOnce && window.ZovioLocalDB) {
      await ZovioLocalDB.putMedia(p.fileId, {
        uid: S.user?.id,
        chatId: m.chatId,
        mime: p.mime || 'application/octet-stream',
        name: p.name || p.title || '',
        size: p.size || blob.size,
        blob
      }).catch(() => {});
      api(`/api/files/${p.fileId}/cached`, { method: 'POST' }).catch(() => {});
    }
    const url = URL.createObjectURL(blob);
    if (!m.viewOnce) blobCache.set(m.id, url);
    return url;
  })();

  _inflightMediaDownloads.set(inflightKey, job);
  try {
    return await job;
  } finally {
    _inflightMediaDownloads.delete(inflightKey);
  }
}

function renderCustomAudioPlayer(url, opts = {}) {
  const isMusic = !!opts.isMusic;
  const isVoice = !!opts.isVoice;
  const bars = [32, 54, 82, 60, 42, 76, 94, 62, 48, 84, 56, 38, 72, 88, 64, 44, 82, 98, 72, 52, 78, 64, 38, 68, 48, 32];
  const barsHtml = bars.map(h => `<span class="wave-bar" style="height:${h}%"></span>`).join('');
  const title = opts.title ? esc(opts.title) : 'Audio';
  const initialDur = (opts.duration && opts.duration > 0)
    ? `${Math.floor(opts.duration / 60)}:${String(Math.floor(opts.duration % 60)).padStart(2, '0')}`
    : '0:00';

  return `
    <div class="fire-audio-player ${isMusic ? 'music-mode' : ''} ${isVoice ? 'is-voice-note' : ''}" data-player data-duration="${opts.duration || 0}">
      <audio preload="metadata" src="${esc(url)}"></audio>
      <button type="button" class="audio-play-round" title="Play / Pause">
        <span class="icon-play">${icon('play')}</span>
        <span class="icon-pause hidden">${icon('pause')}</span>
      </button>
      <div class="audio-main-col">
        ${isVoice ? '' : `<div class="audio-title-bar">${title}</div>`}
        <div class="audio-wave-scrubber" title="Click or tap to seek">
          <div class="audio-wave-bars">${barsHtml}</div>
          <div class="audio-progress-fill" style="width:0%"></div>
        </div>
        <div class="audio-meta-row">
          <span class="audio-cur-time">0:00</span>
          <span class="audio-dur-time">${initialDur}</span>
        </div>
      </div>
      <button type="button" class="audio-speed-pill" title="Playback Speed">1x</button>
    </div>
  `;
}

function initCustomAudioPlayers(root = document) {
  const players = root.querySelectorAll('.fire-audio-player[data-player]');
  players.forEach(wrap => {
    if (wrap._inited) return;
    wrap._inited = true;

    const audio = wrap.querySelector('audio');
    const playBtn = wrap.querySelector('.audio-play-round');
    const iconPlay = wrap.querySelector('.icon-play');
    const iconPause = wrap.querySelector('.icon-pause');
    const scrubber = wrap.querySelector('.audio-wave-scrubber');
    const progressFill = wrap.querySelector('.audio-progress-fill');
    const curEl = wrap.querySelector('.audio-cur-time');
    const durEl = wrap.querySelector('.audio-dur-time');
    const speedBtn = wrap.querySelector('.audio-speed-pill');
    const bars = wrap.querySelectorAll('.wave-bar');

    if (!audio || !playBtn) return;

    let knownDur = Number(wrap.dataset.duration) || 0;

    const fmt = s => {
      if (!isFinite(s) || isNaN(s) || s < 0) return '0:00';
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return `${m}:${String(sec).padStart(2, '0')}`;
    };

    if (knownDur > 0) durEl.textContent = fmt(knownDur);

    const updateDur = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        knownDur = audio.duration;
        durEl.textContent = fmt(audio.duration);
      } else if (audio.duration === Infinity) {
        // Fix for Chromium WebM duration bug: seek to high value to force duration calculation
        audio.currentTime = 1e101;
        audio.ontimeupdate = function() {
          this.ontimeupdate = () => {};
          audio.currentTime = 0;
          if (isFinite(audio.duration) && audio.duration > 0) {
            knownDur = audio.duration;
            durEl.textContent = fmt(audio.duration);
          }
        };
      }
    };

    audio.addEventListener('loadedmetadata', updateDur);
    audio.addEventListener('durationchange', updateDur);

    audio.addEventListener('timeupdate', () => {
      const cur = audio.currentTime || 0;
      const dur = (isFinite(audio.duration) && audio.duration > 0) ? audio.duration : knownDur;
      curEl.textContent = fmt(cur);

      if (dur > 0) {
        durEl.textContent = fmt(dur);
        const pct = Math.min(100, Math.max(0, (cur / dur) * 100));
        if (progressFill) progressFill.style.width = `${pct}%`;
        const activeCount = Math.floor((pct / 100) * bars.length);
        bars.forEach((b, idx) => b.classList.toggle('active', idx <= activeCount));
      }
    });

    audio.addEventListener('ended', () => {
      iconPlay.classList.remove('hidden');
      iconPause.classList.add('hidden');
      wrap.classList.remove('playing');
      if (progressFill) progressFill.style.width = '0%';
      bars.forEach(b => b.classList.remove('active'));
    });

    playBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (audio.paused) {
        document.querySelectorAll('.fire-audio-player audio').forEach(a => {
          if (a !== audio && !a.paused) {
            a.pause();
            const parent = a.closest('.fire-audio-player');
            if (parent) {
              parent.classList.remove('playing');
              parent.querySelector('.icon-play')?.classList.remove('hidden');
              parent.querySelector('.icon-pause')?.classList.add('hidden');
            }
          }
        });
        audio.play().then(() => {
          iconPlay.classList.add('hidden');
          iconPause.classList.remove('hidden');
          wrap.classList.add('playing');
        }).catch(() => {});
      } else {
        audio.pause();
        iconPlay.classList.remove('hidden');
        iconPause.classList.add('hidden');
        wrap.classList.remove('playing');
      }
    });

    if (scrubber) {
      scrubber.addEventListener('click', e => {
        e.stopPropagation();
        const rect = scrubber.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const dur = (isFinite(audio.duration) && audio.duration > 0) ? audio.duration : knownDur;
        if (dur > 0) {
          audio.currentTime = ratio * dur;
        }
      });
    }

    if (speedBtn) {
      const speeds = [1, 1.5, 2];
      let spIdx = 0;
      speedBtn.addEventListener('click', e => {
        e.stopPropagation();
        spIdx = (spIdx + 1) % speeds.length;
        const s = speeds[spIdx];
        audio.playbackRate = s;
        speedBtn.textContent = `${s}x`;
      });
    }
  });
}

function renderCustomVideoPlayer(url, opts = {}) {
  const initialDur = (opts.duration && opts.duration > 0)
    ? `${Math.floor(opts.duration / 60)}:${String(Math.floor(opts.duration % 60)).padStart(2, '0')}`
    : '0:00';
  const cleanPoster = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect width='1' height='1' fill='%230b0d16'/%3E%3C/svg%3E";
  const srcUrl = (url && !String(url).includes('#t=')) ? `${url}#t=0.05` : url;

  return `
    <div class="fire-video-player ${opts.compact ? 'compact' : ''}" data-video-player data-mid="${esc(opts.mid || '')}" tabindex="0">
      <video src="${esc(srcUrl)}" poster="${cleanPoster}" playsinline preload="auto" ${opts.autoPlay ? 'autoplay' : ''}></video>

      <!-- Ambient Dark Gradient Vignette for Readability (WhatsApp Style) -->
      <div class="wa-video-vignette"></div>

      <!-- Center WhatsApp Frosted Glass Play Button -->
      <button type="button" class="v-center-play-btn wa-play-btn" title="Play Video" aria-label="Play">
        <svg viewBox="0 0 24 24" class="wa-play-icon"><polygon points="7 4 19 12 7 20 7 4"></polygon></svg>
      </button>

      <!-- Video Duration Tag at Bottom Left (WhatsApp Style) -->
      <div class="wa-video-duration-tag">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="wa-cam-ico"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
        <span class="v-dur-pill-time">${initialDur}</span>
      </div>

      <!-- Video Expand / Fullscreen Button at Top Right -->
      <button type="button" class="v-top-expand-btn" title="Open in Fullscreen Media Viewer">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
      </button>

      <!-- Sleek WhatsApp Bottom Scrubber & Mini Controls -->
      <div class="wa-video-bottom-bar">
        <div class="video-scrubber-wrap" title="Seek">
          <div class="video-scrubber-track">
            <div class="video-buffer-fill" style="width:0%"></div>
            <div class="video-progress-fill" style="width:0%"></div>
          </div>
        </div>
        <div class="wa-video-mini-controls">
          <div class="row gap-xs" style="align-items:center">
            <button type="button" class="wa-mini-btn v-btn-play" title="Play / Pause">
              <span class="v-btn-icon-play">${icon('play')}</span>
              <span class="v-btn-icon-pause hidden">${icon('pause')}</span>
            </button>
            <button type="button" class="wa-mini-btn v-btn-vol" title="Mute / Unmute">
              <span class="v-btn-icon-vol">${icon('volume')}</span>
              <span class="v-btn-icon-mute hidden">${icon('volumeMute')}</span>
            </button>
            <span class="wa-time-text"><span class="v-cur-time">0:00</span> / <span class="v-dur-time">${initialDur}</span></span>
          </div>
          <div class="row gap-xs" style="align-items:center">
            <button type="button" class="wa-mini-btn v-btn-speed" title="Speed">1x</button>
            <button type="button" class="wa-mini-btn v-btn-pip" title="Picture in Picture">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><rect x="2" y="4" width="20" height="16" rx="2"/><rect x="12" y="10" width="8" height="8" rx="1"/></svg>
            </button>
            <button type="button" class="wa-mini-btn v-btn-lightbox" title="Open Media Lightbox">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function initCustomVideoPlayers(root = document) {
  const players = root.querySelectorAll('.fire-video-player[data-video-player]');
  players.forEach(wrap => {
    if (wrap._inited) return;
    wrap._inited = true;

    const video = wrap.querySelector('video');
    const centerPlayBtn = wrap.querySelector('.v-center-play-btn');
    const btnPlay = wrap.querySelector('.v-btn-play');
    const iconPlay = wrap.querySelector('.v-btn-icon-play');
    const iconPause = wrap.querySelector('.v-btn-icon-pause');
    const btnVol = wrap.querySelector('.v-btn-vol');
    const iconVol = wrap.querySelector('.v-btn-icon-vol');
    const iconMute = wrap.querySelector('.v-btn-icon-mute');
    const curTimeEl = wrap.querySelector('.v-cur-time');
    const durTimeEl = wrap.querySelector('.v-dur-time');
    const durPillEl = wrap.querySelector('.v-dur-pill-time');
    const progFill = wrap.querySelector('.video-progress-fill');
    const bufFill = wrap.querySelector('.video-buffer-fill');
    const scrubberWrap = wrap.querySelector('.video-scrubber-wrap');
    const speedBtn = wrap.querySelector('.v-btn-speed');
    const pipBtn = wrap.querySelector('.v-btn-pip');
    const topExpandBtn = wrap.querySelector('.v-top-expand-btn');
    const btnLightbox = wrap.querySelector('.v-btn-lightbox');

    const fmt = s => {
      if (!isFinite(s) || isNaN(s) || s < 0) return '0:00';
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60).toString().padStart(2, '0');
      return `${m}:${sec}`;
    };

    const getKnownDuration = () => {
      if (wrap._computedDuration && isFinite(wrap._computedDuration) && wrap._computedDuration > 0) return wrap._computedDuration;
      if (video.duration && isFinite(video.duration) && video.duration > 0 && video.duration !== Infinity) return video.duration;
      return 0;
    };

    const togglePlay = e => {
      e?.stopPropagation();
      if (video.paused || video.ended) {
        document.querySelectorAll('video, audio').forEach(el => {
          if (el !== video && !el.paused) el.pause();
        });
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    };

    if (centerPlayBtn) centerPlayBtn.onclick = togglePlay;
    if (btnPlay) btnPlay.onclick = togglePlay;
    video.onclick = togglePlay;
    video.ondblclick = e => {
      e.stopPropagation();
      const mid = wrap.dataset.mid;
      if (mid) openWhatsAppMediaLightbox(mid);
    };

    if (topExpandBtn) {
      topExpandBtn.onclick = e => {
        e.stopPropagation();
        video.pause();
        const mid = wrap.dataset.mid;
        if (mid) openWhatsAppMediaLightbox(mid);
      };
    }
    if (btnLightbox) {
      btnLightbox.onclick = e => {
        e.stopPropagation();
        video.pause();
        const mid = wrap.dataset.mid;
        if (mid) openWhatsAppMediaLightbox(mid);
      };
    }

    video.addEventListener('play', () => {
      wrap.classList.add('is-playing');
      if (iconPlay) iconPlay.classList.add('hidden');
      if (iconPause) iconPause.classList.remove('hidden');
    });

    video.addEventListener('pause', () => {
      wrap.classList.remove('is-playing');
      if (iconPlay) iconPlay.classList.remove('hidden');
      if (iconPause) iconPause.classList.add('hidden');
      wrap.classList.remove('hide-controls');
    });

    video.addEventListener('ended', () => {
      wrap.classList.remove('is-playing');
      if (iconPlay) iconPlay.classList.remove('hidden');
      if (iconPause) iconPause.classList.add('hidden');
      wrap.classList.remove('hide-controls');
      if (progFill) progFill.style.width = '100%';
    });

    const handleDurationDetection = () => {
      if (video.duration === Infinity || !isFinite(video.duration) || isNaN(video.duration)) {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          const discovered = (video.duration && isFinite(video.duration) && video.duration > 0) ? video.duration : video.currentTime;
          video.currentTime = 0;
          if (discovered && isFinite(discovered) && discovered > 0) {
            wrap._computedDuration = discovered;
            if (durTimeEl) durTimeEl.textContent = fmt(discovered);
            if (durPillEl) durPillEl.textContent = fmt(discovered);
          }
        };
        video.addEventListener('seeked', onSeeked, { once: true });
        video.currentTime = 1e10;
      } else if (video.duration && isFinite(video.duration)) {
        wrap._computedDuration = video.duration;
        if (durTimeEl) durTimeEl.textContent = fmt(video.duration);
        if (durPillEl) durPillEl.textContent = fmt(video.duration);
      }
    };

    video.addEventListener('loadedmetadata', handleDurationDetection);
    video.addEventListener('durationchange', handleDurationDetection);
    video.addEventListener('loadeddata', () => {
      try {
        if (video.poster?.startsWith('data:image/svg+xml') && video.videoWidth > 0 && video.videoHeight > 0) {
          const canvas = document.createElement('canvas');
          const scale = Math.min(1, 480 / Math.max(video.videoWidth, video.videoHeight));
          canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
          canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frameUrl = canvas.toDataURL('image/jpeg', 0.72);
            if (frameUrl && frameUrl.length > 100) video.poster = frameUrl;
          }
        }
      } catch {}
    }, { once: true });

    video.addEventListener('timeupdate', () => {
      const cur = video.currentTime || 0;
      if (curTimeEl) curTimeEl.textContent = fmt(cur);
      if (cur > (wrap._computedDuration || 0)) {
        wrap._computedDuration = cur;
      }
      const total = getKnownDuration();
      if (total > 0) {
        if (durTimeEl) durTimeEl.textContent = fmt(total);
        const pct = Math.min(100, Math.max(0, (cur / total) * 100));
        if (progFill) progFill.style.width = `${pct}%`;
      } else {
        if (progFill) progFill.style.width = '0%';
        if (durTimeEl) durTimeEl.textContent = fmt(cur);
      }
    });

    video.addEventListener('progress', () => {
      const total = getKnownDuration();
      if (total > 0 && video.buffered.length > 0 && bufFill) {
        const bufEnd = video.buffered.end(video.buffered.length - 1);
        bufFill.style.width = `${Math.min(100, (bufEnd / total) * 100)}%`;
      }
    });

    // Auto-hide controls after inactivity while playing
    let hideTimer = null;
    const showControlsTemporarily = () => {
      wrap.classList.remove('hide-controls');
      clearTimeout(hideTimer);
      if (!video.paused) {
        hideTimer = setTimeout(() => {
          if (!video.paused) wrap.classList.add('hide-controls');
        }, 2400);
      }
    };
    wrap.addEventListener('mousemove', showControlsTemporarily);
    wrap.addEventListener('touchstart', showControlsTemporarily, { passive: true });
    wrap.addEventListener('mouseleave', () => {
      if (!video.paused) wrap.classList.add('hide-controls');
    });

    // Scrubber seeking
    let isSeeking = false;
    const seek = e => {
      if (!scrubberWrap) return;
      const rect = scrubberWrap.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const total = getKnownDuration();
      if (total > 0) {
        if (progFill) progFill.style.width = `${pos * 100}%`;
        video.currentTime = pos * total;
        if (curTimeEl) curTimeEl.textContent = fmt(video.currentTime);
      }
    };

    if (scrubberWrap) {
      scrubberWrap.addEventListener('mousedown', e => {
        e.stopPropagation();
        isSeeking = true;
        wrap.classList.add('is-scrubbing');
        seek(e);
        const onMove = ev => { if (isSeeking) seek(ev); };
        const onUp = () => {
          isSeeking = false;
          wrap.classList.remove('is-scrubbing');
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      });
    }

    // Volume toggle
    if (btnVol) {
      btnVol.onclick = e => {
        e.stopPropagation();
        video.muted = !video.muted;
        if (iconVol) iconVol.classList.toggle('hidden', video.muted);
        if (iconMute) iconMute.classList.toggle('hidden', !video.muted);
      };
    }

    // Playback Speed switcher
    if (speedBtn) {
      const speeds = [1, 1.25, 1.5, 2];
      let spIdx = 0;
      speedBtn.onclick = e => {
        e.stopPropagation();
        spIdx = (spIdx + 1) % speeds.length;
        video.playbackRate = speeds[spIdx];
        speedBtn.textContent = `${speeds[spIdx]}x`;
      };
    }

    // Picture in Picture
    if (pipBtn) {
      if (document.pictureInPictureEnabled && typeof video.requestPictureInPicture === 'function') {
        pipBtn.onclick = async e => {
          e.stopPropagation();
          try {
            if (document.pictureInPictureElement) {
              await document.exitPictureInPicture();
            } else {
              await video.requestPictureInPicture();
            }
          } catch {}
        };
      } else {
        pipBtn.classList.add('hidden');
      }
    }
  });
}

function isViewOnceMsg(m) {
  return Boolean(m && (m.viewOnce || m.isViewOnce || m._plain?.viewOnce || m.body?.viewOnce));
}

// ==========================================================================
// Full-Screen WhatsApp Media Lightbox (Viewer for Photos & Videos)
// ==========================================================================
async function openWhatsAppMediaLightbox(targetMid) {
  const root = $('#mediaLightboxRoot');
  if (!root) return;

  const chat = S.chats.get(S.activeChatId);
  if (!chat) return;

  const allMsgs = S.msgs.get(chat.id) || [];
  const mediaMsgs = allMsgs.filter(m => !m.deleted && !isViewOnceMsg(m) && (m.kind === 'image' || m.kind === 'video'));
  if (!mediaMsgs.length) return;

  let activeIdx = mediaMsgs.findIndex(m => m.id === targetMid);
  if (activeIdx < 0) activeIdx = 0;

  let zoomLevel = 1;
  let rotationDeg = 0;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let startX = 0, startY = 0;

  root.classList.remove('hidden');

  async function renderActiveMedia() {
    const m = mediaMsgs[activeIdx];
    if (!m) return;
    const p = m._plain || m.body || {};
    const sender = S.users.get(m.senderId) || (m.senderId === S.user.id ? S.user : { name: 'Member' });
    const isMe = m.senderId === S.user.id;
    const senderName = isMe ? 'You' : (sender.name || 'User');
    const timeStr = `${fmtTime(m.ts)} · ${new Date(m.ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`;
    const isStarred = (m.starredBy || []).includes(S.user?.id);

    zoomLevel = 1;
    rotationDeg = 0;
    panX = 0;
    panY = 0;

    root.innerHTML = `
      <div class="wa-lightbox-header">
        <div class="wa-lightbox-header-left">
          <button type="button" class="wa-lightbox-back-btn" id="waLbCloseBtn" title="Back (Esc)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          ${avatarHTML(sender, 'sm')}
          <div class="wa-lightbox-user-info">
            <span class="wa-lightbox-username">${esc(senderName)}</span>
            <span class="wa-lightbox-time">${esc(timeStr)}</span>
          </div>
        </div>
        <div class="wa-lightbox-header-right">
          ${m.kind === 'image' ? `
            <button type="button" class="wa-lightbox-tool-btn" id="waLbZoomOut" title="Zoom Out (−)">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            </button>
            <button type="button" class="wa-lightbox-tool-btn" id="waLbZoomReset" title="Reset Zoom (1:1)" style="font-size:12px;font-weight:700">
              1:1
            </button>
            <button type="button" class="wa-lightbox-tool-btn" id="waLbZoomIn" title="Zoom In (+)">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            </button>
            <button type="button" class="wa-lightbox-tool-btn" id="waLbRotate" title="Rotate (⟳)">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            </button>
          ` : ''}
          <button type="button" class="wa-lightbox-tool-btn ${isStarred ? 'active' : ''}" id="waLbStar" title="${isStarred ? 'Unstar' : 'Star'}">
            ${isStarred ? icon('starFill') : icon('star')}
          </button>
          <button type="button" class="wa-lightbox-tool-btn" id="waLbForward" title="Forward">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg>
          </button>
          <button type="button" class="wa-lightbox-tool-btn" id="waLbDownload" title="Download">
            ${icon('download')}
          </button>
          <button type="button" class="wa-lightbox-tool-btn" id="waLbCloseCross" title="Close (Esc)">
            ✕
          </button>
        </div>
      </div>

      <div class="wa-lightbox-viewport" id="waLbViewport">
        <button type="button" class="wa-lightbox-nav-btn prev ${activeIdx === 0 ? 'hidden' : ''}" id="waLbPrevBtn" title="Previous media (Left Arrow)">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button type="button" class="wa-lightbox-nav-btn next ${activeIdx === mediaMsgs.length - 1 ? 'hidden' : ''}" id="waLbNextBtn" title="Next media (Right Arrow)">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        <div class="wa-lightbox-content-box" id="waLbContentBox">
          <div class="spinner" style="width:36px;height:36px;border-width:3px"></div>
        </div>

        ${p.caption ? `<div class="wa-lightbox-caption">${esc(p.caption)}</div>` : ''}
      </div>

      <!-- Filmstrip Carousel of all media in this chat -->
      <div class="wa-lightbox-filmstrip" id="waLbFilmstrip">
        ${mediaMsgs.map((item, idx) => {
          const cachedUrl = blobCache.get(item.id);
          const isVid = item.kind === 'video';
          return `
            <div class="wa-filmstrip-thumb ${idx === activeIdx ? 'active' : ''}" data-idx="${idx}" title="${esc(item._plain?.name || (isVid ? 'Video' : 'Photo'))}">
              ${cachedUrl ? (isVid ? `<video src="${cachedUrl}"></video>` : `<img src="${cachedUrl}" alt="">`) : `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#888;font-size:16px">${isVid ? '🎬' : '📷'}</div>`}
              ${isVid ? `<span class="wa-filmstrip-vid-badge">▶</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;

    try {
      const url = await fetchDecryptedBlob(m);
      const box = $('#waLbContentBox', root);
      if (!box) return;

      if (m.kind === 'video') {
        box.innerHTML = `
          <div class="wa-lightbox-video-wrap">
            <video src="${url}" controls autoplay playsinline style="width:100%;max-height:calc(100vh - 200px);border-radius:12px;display:block"></video>
          </div>
        `;
      } else {
        box.innerHTML = `
          <img class="wa-lightbox-img" id="waLbMainImg" src="${url}" alt="${esc(p.name || 'Photo')}">
        `;
        const img = $('#waLbMainImg', box);

        const applyTransform = () => {
          if (!img) return;
          img.style.transform = `scale(${zoomLevel}) translate(${panX}px, ${panY}px) rotate(${rotationDeg}deg)`;
        };

        $('#waLbZoomIn', root)?.addEventListener('click', () => {
          zoomLevel = Math.min(3.5, zoomLevel + 0.35);
          applyTransform();
        });
        $('#waLbZoomOut', root)?.addEventListener('click', () => {
          zoomLevel = Math.max(0.6, zoomLevel - 0.35);
          if (zoomLevel <= 1) { panX = 0; panY = 0; }
          applyTransform();
        });
        $('#waLbZoomReset', root)?.addEventListener('click', () => {
          zoomLevel = 1;
          panX = 0;
          panY = 0;
          rotationDeg = 0;
          applyTransform();
        });
        $('#waLbRotate', root)?.addEventListener('click', () => {
          rotationDeg = (rotationDeg + 90) % 360;
          applyTransform();
        });

        img.ondblclick = () => {
          zoomLevel = zoomLevel > 1.2 ? 1 : 2;
          panX = 0;
          panY = 0;
          applyTransform();
        };

        box.onwheel = e => {
          e.preventDefault();
          if (e.deltaY < 0) zoomLevel = Math.min(3.5, zoomLevel + 0.2);
          else zoomLevel = Math.max(0.6, zoomLevel - 0.2);
          if (zoomLevel <= 1) { panX = 0; panY = 0; }
          applyTransform();
        };

        img.onmousedown = e => {
          if (zoomLevel <= 1) return;
          e.preventDefault();
          isDragging = true;
          startX = e.clientX - panX;
          startY = e.clientY - panY;
          const onMove = ev => {
            if (!isDragging) return;
            panX = ev.clientX - startX;
            panY = ev.clientY - startY;
            applyTransform();
          };
          const onUp = () => {
            isDragging = false;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
          };
          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
        };
      }

      // Also ensure thumbnail in filmstrip has cached URL
      const currentThumb = $(`[data-idx="${activeIdx}"]`, root);
      if (currentThumb && !currentThumb.querySelector('img, video')) {
        currentThumb.innerHTML = m.kind === 'video' ? `<video src="${url}"></video><span class="wa-filmstrip-vid-badge">▶</span>` : `<img src="${url}" alt="">`;
      }
    } catch (e) {
      const box = $('#waLbContentBox', root);
      if (box) box.innerHTML = `<div class="muted">${esc(e.message)}</div>`;
    }

    const closeLightbox = () => {
      root.classList.add('hidden');
      root.innerHTML = '';
      root._closeLightbox = null;
      window.removeEventListener('keydown', handleKeyNav);
    };
    root._closeLightbox = closeLightbox;

    $('#waLbCloseBtn', root).onclick = closeLightbox;
    $('#waLbCloseCross', root).onclick = closeLightbox;

    $('#waLbDownload', root).onclick = () => downloadAttachment(chat, m.id);
    $('#waLbForward', root).onclick = () => {
      closeLightbox();
      openForwardModal(m);
    };
    $('#waLbStar', root).onclick = async () => {
      await toggleStarMessage(m.id);
      renderActiveMedia();
    };

    const prevBtn = $('#waLbPrevBtn', root);
    const nextBtn = $('#waLbNextBtn', root);
    const goPrevMedia = () => {
      if (activeIdx > 0) {
        activeIdx--;
        renderActiveMedia();
        return true;
      }
      return false;
    };
    const goNextMedia = () => {
      if (activeIdx < mediaMsgs.length - 1) {
        activeIdx++;
        renderActiveMedia();
        return true;
      }
      return false;
    };
    if (prevBtn) prevBtn.onclick = goPrevMedia;
    if (nextBtn) nextBtn.onclick = goNextMedia;

    // Mobile & touch swipe gestures: swipe left/right between media, swipe down to close, double-tap to zoom
    const viewport = $('#waLbViewport', root);
    const contentBox = $('#waLbContentBox', root);
    if (viewport && contentBox) {
      let touchStartX = 0, touchStartY = 0, touchDx = 0, touchDy = 0;
      let tracking = false, gestureMode = null; // 'swipe' | 'pan'
      let panStartX = 0, panStartY = 0, lastTapTs = 0;

      viewport.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        const t = e.touches[0];
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        touchDx = 0;
        touchDy = 0;
        tracking = true;
        if (zoomLevel > 1.05 && m.kind === 'image') {
          gestureMode = 'pan';
          panStartX = t.clientX - panX;
          panStartY = t.clientY - panY;
        } else {
          gestureMode = 'swipe';
          contentBox.style.transition = 'none';
        }
      }, { passive: true });

      viewport.addEventListener('touchmove', (e) => {
        if (!tracking || e.touches.length !== 1) return;
        const t = e.touches[0];
        touchDx = t.clientX - touchStartX;
        touchDy = t.clientY - touchStartY;
        if (gestureMode === 'pan') {
          const img = $('#waLbMainImg', contentBox);
          if (img) {
            panX = t.clientX - panStartX;
            panY = t.clientY - panStartY;
            img.style.transform = `scale(${zoomLevel}) translate(${panX}px, ${panY}px) rotate(${rotationDeg}deg)`;
          }
          return;
        }
        if (Math.abs(touchDx) > Math.abs(touchDy)) {
          const atEdge = (touchDx > 0 && activeIdx === 0) || (touchDx < 0 && activeIdx === mediaMsgs.length - 1);
          const damp = atEdge ? 0.25 : 0.85;
          contentBox.style.transform = `translate3d(${touchDx * damp}px, 0, 0)`;
        } else if (touchDy > 0) {
          const dampY = Math.min(touchDy * 0.75, 160);
          contentBox.style.transform = `translate3d(0, ${dampY}px, 0) scale(${Math.max(0.84, 1 - touchDy / 900)})`;
        }
      }, { passive: true });

      viewport.addEventListener('touchend', (e) => {
        if (!tracking) return;
        tracking = false;
        if (gestureMode === 'pan') {
          gestureMode = null;
          return;
        }
        gestureMode = null;
        contentBox.style.transition = 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
        contentBox.style.transform = '';

        // Double tap on image toggles 1x <-> 2x zoom
        if (Math.abs(touchDx) < 10 && Math.abs(touchDy) < 10 && m.kind === 'image') {
          const now = Date.now();
          if (now - lastTapTs < 280) {
            lastTapTs = 0;
            zoomLevel = zoomLevel > 1.05 ? 1 : 2;
            panX = 0;
            panY = 0;
            const img = $('#waLbMainImg', contentBox);
            if (img) img.style.transform = `scale(${zoomLevel}) translate(0px, 0px) rotate(${rotationDeg}deg)`;
            return;
          }
          lastTapTs = now;
        }

        if (Math.abs(touchDx) > 50 && Math.abs(touchDx) > Math.abs(touchDy) * 1.1) {
          if (touchDx < 0) goNextMedia();
          else goPrevMedia();
          return;
        }
        if (touchDy > 95 && Math.abs(touchDy) > Math.abs(touchDx) * 1.2) {
          closeLightbox();
        }
      }, { passive: true });
    }

    $$('.wa-filmstrip-thumb', root).forEach(thumb => {
      thumb.onclick = () => {
        const idx = parseInt(thumb.dataset.idx, 10);
        if (!isNaN(idx) && idx !== activeIdx) {
          activeIdx = idx;
          renderActiveMedia();
        }
      };
    });
    const activeThumb = $(`.wa-filmstrip-thumb[data-idx="${activeIdx}"]`, root);
    activeThumb?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  const handleKeyNav = e => {
    if (root.classList.contains('hidden')) return;
    if (e.key === 'Escape') {
      root.classList.add('hidden');
      root.innerHTML = '';
      root._closeLightbox = null;
      window.removeEventListener('keydown', handleKeyNav);
    } else if (e.key === 'ArrowLeft') {
      if (activeIdx > 0) {
        activeIdx--;
        renderActiveMedia();
      }
    } else if (e.key === 'ArrowRight') {
      if (activeIdx < mediaMsgs.length - 1) {
        activeIdx++;
        renderActiveMedia();
      }
    }
  };

  window.removeEventListener('keydown', handleKeyNav);
  window.addEventListener('keydown', handleKeyNav);

  await renderActiveMedia();
}

async function autoRenderInlineMedia(chat, mid, kind, slot) {
  const m = (S.msgs.get(chat.id) || []).find(x => x.id === mid);
  if (!m) return;
  const p = m._plain || m.body || {};
  try {
    const url = await fetchDecryptedBlob(m);
    if (slot.classList.contains('wa-album-media-slot')) {
      if (kind === 'video') {
        slot.innerHTML = `<video src="${url}#t=0.1" preload="metadata" muted playsinline class="wa-album-thumb-media"></video>`;
      } else {
        slot.innerHTML = `<img class="wa-album-thumb-media" src="${url}" alt="${esc(p.name || 'Photo')}" loading="lazy">`;
      }
      return;
    }
    if (kind === 'audio') {
      slot.innerHTML = renderCustomAudioPlayer(url, { isVoice: true, title: 'Voice Note', duration: p.duration || 0 });
      initCustomAudioPlayers(slot);
    } else if (kind === 'video') {
      slot.innerHTML = renderCustomVideoPlayer(url, { title: p.name || 'Video', duration: p.duration || 0, mid: m.id });
      initCustomVideoPlayers(slot);
      const vidEl = slot.querySelector('video');
      if (vidEl) {
        vidEl.addEventListener('loadedmetadata', () => {
          const sc = $('#msgsScroll');
          if (sc && !S.userScrolledUp) sc.scrollTop = sc.scrollHeight;
        }, { once: true });
      }
    } else if (kind === 'sticker') {
      const emoji = p.emoji || '';
      slot.innerHTML = `
        <div class="msg-sticker-container" data-sticker-url="${esc(url)}">
          <img src="${url}" alt="${esc(emoji || 'Sticker')}" class="msg-sticker-img">
          ${emoji ? `<span class="msg-sticker-hover-emoji" title="${esc(emoji)}">${esc(emoji)}</span>` : ''}
        </div>
      `;
    } else if (kind === 'gif') {
      slot.innerHTML = `
        <div class="msg-gif-container" data-gif-url="${esc(url)}">
          <img src="${url}" alt="${esc(p.title || 'GIF')}" class="msg-gif-img">
          <span class="msg-gif-pill">GIF</span>
        </div>
      `;
    } else {
      slot.innerHTML = `
        <div class="wa-media-img-container" data-viewmedia="${m.id}" title="Click to view full photo">
          <img class="media-img" src="${url}" alt="${esc(p.name || 'Photo')}">
          <div class="wa-media-overlay-gradient"></div>
        </div>
      `;
      const imgEl = slot.querySelector('.media-img');
      if (imgEl) {
        imgEl.onload = () => {
          const sc = $('#msgsScroll');
          if (sc && !S.userScrolledUp) sc.scrollTop = sc.scrollHeight;
        };
      }
      slot.querySelector('.wa-media-img-container').onclick = e => {
        e.stopPropagation();
        openWhatsAppMediaLightbox(m.id);
      };
    }
  } catch (e) {
    slot.innerHTML = `<div class="muted" style="font-size:12px;display:flex;align-items:center;gap:8px;padding:6px 10px;">
      <span>Media unavailable (${esc(e.message || 'Load error')})</span>
      <button type="button" class="btn-retry-media" style="background:rgba(255,255,255,.08);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:3px 9px;font-size:11px;cursor:pointer;">Retry</button>
    </div>`;
    const retryBtn = slot.querySelector('.btn-retry-media');
    if (retryBtn) {
      retryBtn.onclick = ev => {
        ev.stopPropagation();
        blobCache.delete(m.id);
        slot.innerHTML = `<div class="muted" style="font-size:12px;padding:6px 10px;">Retrying…</div>`;
        autoRenderInlineMedia(chat, mid, kind, slot);
      };
    }
  }
}

async function downloadAttachment(chat, mid) {
  const m = (S.msgs.get(chat.id) || []).find(x => x.id === mid);
  if (!m) return;
  const p = m._plain || m.body || {};
  const prog = $(`#dlprog-${mid}`);
  if (prog) prog.classList.remove('hidden');
  try {
    const url = await fetchDecryptedBlob(m, pct => {
      if (prog) prog.firstElementChild.style.width = `${pct}%`;
    });
    const a = document.createElement('a');
    a.href = url;
    a.download = p.name || 'download';
    a.click();
  } catch (e) {
    toast(e.message, 'err');
  } finally {
    if (prog) prog.classList.add('hidden');
  }
}

async function openViewOnce(chat, mid) {
  const m = (S.msgs.get(chat.id) || []).find(x => x.id === mid);
  if (!m) return;
  if ((m.viewedBy || []).includes(S.user.id)) return toast('This One-View media has already been opened and destroyed');
  if (m.senderId === S.user.id && chat.type !== 'self') {
    return toast('Only the recipient can open a One-View photo or video');
  }
  const p = m._plain || m.body || {};
  const isVideo = (p.mime || '').startsWith('video/') || m.kind === 'video';

  const voCard = document.querySelector(`[data-vo="${mid}"]`);
  const ring = voCard?.querySelector('.vo-ring');
  if (ring) {
    ring.classList.add('downloading');
    ring.textContent = '';
  }

  try {
    const url = await fetchDecryptedBlob(m);
    if (ring) {
      ring.classList.remove('downloading');
      ring.textContent = '1';
    }

    // Full-screen WhatsApp-style Lightbox for One-View Media
    const overlay = document.createElement('div');
    overlay.className = 'wa-view-once-lightbox';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(8,10,16,0.98);backdrop-filter:blur(24px);z-index:99999;display:flex;flex-direction:column;animation:fadeIn .2s ease';

    const sender = S.users.get(m.senderId) || (m.senderId === S.user.id ? S.user : { name: 'Contact' });

    overlay.innerHTML = `
      <div style="height:60px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;border-bottom:1px solid rgba(255,255,255,0.08);background:rgba(14,16,24,0.92);color:#fff;z-index:10">
        <div style="display:flex;align-items:center;gap:12px">
          <button type="button" class="icon-btn" id="voCloseBackBtn" style="color:#fff" title="Back (Esc)">${icon('arrowLeft')}</button>
          <div>
            <div style="font-weight:700;font-size:14px;color:#fff">${esc(sender?.name || 'Contact')}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.6)">${fmtTime(m.ts)}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <span class="pill" style="background:rgba(255,183,3,0.18);border:1px solid rgba(255,183,3,0.4);color:#ffd166;font-size:11px;font-weight:700">👁️ 1 · One-View Media</span>
          <button type="button" class="icon-btn" id="voCloseCrossBtn" style="color:#fff" title="Close (Esc)">${icon('close')}</button>
        </div>
      </div>

      <div style="flex:1;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;padding:16px" id="voViewport">
        ${isVideo
          ? `<div style="max-width:90vw;max-height:80vh;display:flex;align-items:center;justify-content:center">${renderCustomVideoPlayer(url, { isViewOnce: true, autoPlay: true })}</div>`
          : `<img src="${url}" style="max-width:92vw;max-height:82vh;object-fit:contain;border-radius:12px;box-shadow:0 12px 48px rgba(0,0,0,0.8);user-select:none" oncontextmenu="return false">`
        }
      </div>

      <div style="padding:12px 20px;text-align:center;background:rgba(12,14,22,0.95);border-top:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.7);font-size:12px">
        🔒 This ${isVideo ? 'video' : 'photo'} is permanently deleted from the server and will self-destruct upon closing.
      </div>
    `;

    document.body.appendChild(overlay);
    hydrateIcons(overlay);
    if (isVideo) initCustomVideoPlayers(overlay);

    let destroyed = false;
    const triggerDestroy = async () => {
      if (destroyed) return;
      destroyed = true;
      document.removeEventListener('keydown', onKeyDown);
      overlay.remove();
      URL.revokeObjectURL(url);

      if (p.fileId) {
        api(`/api/files/${p.fileId}/viewed`, { method: 'POST' }).catch(() => {});
      }
      m.viewedBy = [...(m.viewedBy || []), S.user.id];

      if (voCard) {
        voCard.classList.add('opened');
        const r = voCard.querySelector('.vo-ring');
        if (r) {
          r.className = 'vo-ring opened';
          r.textContent = '✓';
        }
        const titleEl = voCard.querySelector('div[style*="font-weight"]');
        if (titleEl) titleEl.textContent = 'Opened';
        const subEl = voCard.querySelector('small.muted');
        if (subEl) subEl.textContent = 'Media self-destructed after viewing';
      }
      toast('One-view media destroyed', 'info');
    };

    const onKeyDown = e => {
      if (e.key === 'Escape') triggerDestroy();
    };
    document.addEventListener('keydown', onKeyDown);

    $('#voCloseBackBtn', overlay).onclick = triggerDestroy;
    $('#voCloseCrossBtn', overlay).onclick = triggerDestroy;
  } catch (e) {
    if (ring) {
      ring.classList.remove('downloading');
      ring.textContent = '1';
    }
    toast(e.message || 'Could not load One-View media', 'err');
  }
}

// ---------------- Interactive Voice Note Recorder ----------------
function bindVoiceRecorder(btn) {
  let rec = null, chunks = [], stream = null, timer = null, secs = 0, shouldSend = true;

  const pickMime = () => {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
    for (const t of types) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) return t;
    }
    return '';
  };

  const stopCleanup = () => {
    window._stopAndSendVoiceNote = null;
    if (timer) { clearInterval(timer); timer = null; }
    if (stream) {
      try { stream.getTracks().forEach(t => t.stop()); } catch {}
      stream = null;
    }
    rec = null;
    btn.classList.remove('active');
    $('#convo')?.classList.remove('is-recording-voice');
    const bar = $('#voiceRecBar');
    if (bar) {
      bar.classList.add('hidden');
      bar.innerHTML = '';
    }
  };

  const finalizeRecording = (sendFlag) => {
    shouldSend = sendFlag;
    window._stopAndSendVoiceNote = null;
    if (rec && rec.state === 'recording') {
      try { rec.requestData?.(); } catch {}
      try { rec.stop(); } catch { stopCleanup(); }
    } else {
      stopCleanup();
    }
  };

  btn.onclick = async () => {
    if (rec && rec.state === 'recording') {
      finalizeRecording(true);
      return;
    }
    try {
      if (window.ZovioAndroid?.ensurePermissions) {
        const perm = await window.ZovioAndroid.ensurePermissions({ audio: true, video: false }).catch(() => ({ granted: true }));
        if (perm && perm.granted === false) {
          toast('Microphone permission denied', 'err');
          return;
        }
      }
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = [];
      const mimeType = pickMime();
      rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const recorderRef = rec;
      rec.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };
      rec.onerror = () => {
        stopCleanup();
        toast('Could not record audio', 'err');
      };
      rec.onstop = () => {
        const finalMime = recorderRef.mimeType || mimeType || 'audio/webm';
        const ext = finalMime.includes('mp4') ? 'm4a' : finalMime.includes('ogg') ? 'ogg' : 'webm';
        const blob = new Blob(chunks, { type: finalMime });
        const recordedSecs = Math.max(1, secs);
        const wantSend = shouldSend;
        stopCleanup();
        if (wantSend && blob.size > 0) {
          const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: finalMime });
          uploadEncryptedFile(file, { duration: recordedSecs });
        } else if (wantSend) {
          toast('Voice note was too short', 'err');
        }
      };

      shouldSend = true;
      rec.start(200);
      secs = 0;
      btn.classList.add('active');
      $('#convo')?.classList.add('is-recording-voice');
      window._stopAndSendVoiceNote = () => finalizeRecording(true);

      const bar = $('#voiceRecBar');
      if (bar) {
        bar.classList.remove('hidden');
        bar.innerHTML = `
          <div class="voice-rec-live-wrap">
            <div class="voice-rec-info">
              <span class="rec-dot-pulsing"></span>
              <span class="voice-rec-label">Recording</span>
              <span class="mono voice-rec-timer" id="recTime">00:00</span>
            </div>
            <div class="voice-rec-visualizer">
              <span class="rec-bar"></span><span class="rec-bar"></span><span class="rec-bar"></span>
              <span class="rec-bar"></span><span class="rec-bar"></span><span class="rec-bar"></span>
              <span class="rec-bar"></span><span class="rec-bar"></span>
            </div>
            <div class="voice-rec-actions">
              <button type="button" class="btn ghost sm voice-cancel-btn" id="cancelVoiceBtn" title="Discard">${icon('trash')}</button>
              <button type="button" class="btn primary sm glow voice-send-btn" id="sendVoiceBtn" title="Send Voice Note">${icon('send')} <span>Send</span></button>
            </div>
          </div>`;
        hydrateIcons(bar);
        $('#cancelVoiceBtn', bar).onclick = () => finalizeRecording(false);
        $('#sendVoiceBtn', bar).onclick = () => finalizeRecording(true);
      }

      timer = setInterval(() => {
        secs++;
        const el = $('#recTime');
        if (el) el.textContent = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
      }, 1000);
    } catch {
      stopCleanup();
      toast('Microphone permission denied or unavailable', 'err');
    }
  };
}

// ---------------- Live Camera Modal (Click Photo or Record Video in Chat) ----------------
async function openCameraModal() {
  let stream = null;
  let capturedFile = null;
  let mediaRec = null;
  let recChunks = [];
  let facingMode = 'user';
  let isMirrored = true;
  let camMode = 'photo'; // 'photo' | 'video'
  let isRecording = false;
  let recTimer = null;
  let recSeconds = 0;
  let viewOnce = false;
  let isCameraOpen = true;
  let camReqId = 0;

  const stopStream = () => {
    isCameraOpen = false;
    camReqId++;
    if (recTimer) { clearInterval(recTimer); recTimer = null; }
    if (mediaRec && mediaRec.state === 'recording') {
      try { mediaRec.stop(); } catch {}
    }
    mediaRec = null;
    if (stream) {
      try { stream.getTracks().forEach(t => t.stop()); } catch {}
      stream = null;
    }
    if (window._activeChatCamStream) {
      try { window._activeChatCamStream.getTracks().forEach(t => t.stop()); } catch {}
      window._activeChatCamStream = null;
    }
    const v = document.getElementById('camLiveVideo');
    if (v) {
      try { v.pause(); } catch {}
      v.srcObject = null;
    }
    const sv = document.getElementById('camSnapVideo');
    if (sv) {
      try { sv.pause(); } catch {}
      sv.src = '';
    }
  };

  const startCamera = async box => {
    if (!isCameraOpen) return;
    const currentReq = ++camReqId;
    if (stream) {
      try { stream.getTracks().forEach(t => t.stop()); } catch {}
      stream = null;
    }

    try {
      const constraints = {
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Guard if user closed modal while waiting for hardware
      if (!isCameraOpen || currentReq !== camReqId || !document.getElementById('camLiveVideo')) {
        try { mediaStream.getTracks().forEach(t => t.stop()); } catch {}
        return;
      }

      stream = mediaStream;
      window._activeChatCamStream = mediaStream;

      const v = $('#camLiveVideo', box);
      if (v) {
        v.srcObject = stream;
        v.play().catch(() => {});
        v.classList.remove('hidden');
        v.classList.toggle('mirror', isMirrored && facingMode === 'user');
      }
      $('#camSnapImg', box)?.classList.add('hidden');
      $('#camSnapVideo', box)?.classList.add('hidden');
      $('#camReviewBadge', box)?.classList.add('hidden');
    } catch (err) {
      if (!isCameraOpen || currentReq !== camReqId) return;
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (!isCameraOpen || currentReq !== camReqId) {
          try { fallbackStream.getTracks().forEach(t => t.stop()); } catch {}
          return;
        }
        stream = fallbackStream;
        window._activeChatCamStream = fallbackStream;
        const v = $('#camLiveVideo', box);
        if (v) {
          v.srcObject = stream;
          v.play().catch(() => {});
          v.classList.remove('hidden');
        }
      } catch {
        toast('Camera access unavailable on this device', 'err');
      }
    }
  };

  const fmtTime = sec => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const existingCam = $('#camFullOverlay');
  if (existingCam) existingCam.remove();

  const box = document.createElement('div');
  box.id = 'camFullOverlay';
  box.className = 'cam-full-overlay';
  box.innerHTML = `
    <div class="cam-full-stage" id="camViewfinder">
      <video id="camLiveVideo" class="cam-media-feed mirror" autoplay playsinline muted></video>
      <img id="camSnapImg" class="cam-media-feed hidden" alt="Snapshot">
      <video id="camSnapVideo" class="cam-media-feed hidden" autoplay loop playsinline muted></video>
      <div id="camFlashOverlay" class="cam-flash-overlay"></div>
    </div>

    <div class="cam-full-top">
      <button type="button" class="cam-hud-btn" id="camCloseBtn" title="Close Camera">
        ${icon('close')}
      </button>

      <div class="row gap-s align-center">
        <div id="camRecPill" class="cam-rec-pill hidden">
          <span class="cam-rec-dot"></span>
          <span id="camRecTimerText">00:00</span>
        </div>
        <div id="camReviewBadge" class="cam-preview-badge hidden">
          ${icon('check')} <span id="camReviewBadgeText">Ready</span>
        </div>
      </div>

      <div class="cam-hud-actions">
        <button type="button" class="cam-hud-btn active" id="camMirrorBtn" title="Mirror View">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:17px;height:17px"><path d="M12 3v18"/><path d="M8 7H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h4z"/><path d="M16 7h4a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-4z"/></svg>
        </button>
        <button type="button" class="cam-hud-btn" id="camFlipBtn" title="Switch Camera">
          ${icon('refresh')}
        </button>
      </div>
    </div>

    <div class="cam-full-bottom">
      <div class="cam-mode-bar" id="camModeBar">
        <button type="button" class="cam-mode-tab active" data-mode="photo">Photo</button>
        <button type="button" class="cam-mode-tab" data-mode="video">Video</button>
      </div>

      <div class="cam-controls-row" id="camControlsRow">
        <div style="width:44px"></div>
        <div class="cam-shutter-outer" id="camShutterBtn" title="Capture">
          <div class="cam-shutter-inner"></div>
        </div>
        <button type="button" class="cam-aux-btn" id="camFlipAuxBtn" title="Switch Camera">
          ${icon('refresh')}
        </button>
      </div>

      <div class="cam-review-bar hidden" id="camReviewBar">
        <div class="cam-review-actions">
          <div class="cam-caption-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            <input class="cam-caption-input" id="camCaptionIn" placeholder="Add a caption (optional)…" maxlength="280">
          </div>
          <button type="button" class="cam-oneview-chip" id="camOneViewToggle" title="One-View Media (disappears after opening)">1</button>
        </div>
        <div class="cam-review-actions">
          <button type="button" class="cam-aux-btn" id="camRetakeBtn" title="Retake" disabled style="width:auto;padding:0 16px;border-radius:14px;gap:6px">
            ${icon('refresh')} <span style="font-size:13px;font-weight:700">Retake</span>
          </button>
          <button type="button" class="cam-send-btn" id="sendCamMediaBtn" disabled style="flex:1;margin:0">
            ${icon('send')} <span id="camSendBtnText">Send Media</span>
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(box);
  isCameraOpen = true;
  startCamera(box);

  const stageEl = $('#camViewfinder', box);
  const shutterBtn = $('#camShutterBtn', box);
  const controlsRow = $('#camControlsRow', box);
  const reviewBar = $('#camReviewBar', box);
  const retakeBtn = $('#camRetakeBtn', box);
  const sendBtn = $('#sendCamMediaBtn', box);
  const sendBtnText = $('#camSendBtnText', box);
  const flashOverlay = $('#camFlashOverlay', box);
  const recPill = $('#camRecPill', box);
  const recTimerText = $('#camRecTimerText', box);
  const reviewBadge = $('#camReviewBadge', box);
  const reviewBadgeText = $('#camReviewBadgeText', box);
  const mirrorBtn = $('#camMirrorBtn', box);
  const liveVideo = $('#camLiveVideo', box);
  const snapImg = $('#camSnapImg', box);
  const snapVideo = $('#camSnapVideo', box);
  const modeTabs = $$('.cam-mode-tab', box);
  const modeBar = $('#camModeBar', box);
  const oneViewToggle = $('#camOneViewToggle', box);

  const closeCamOverlay = () => {
    stopStream();
    window.removeEventListener('keydown', onEscCam);
    box.remove();
  };
  const onEscCam = e => {
    if (e.key === 'Escape') closeCamOverlay();
  };
  window.addEventListener('keydown', onEscCam);
  $('#camCloseBtn', box).onclick = closeCamOverlay;

  const updateMirror = () => {
    isMirrored = !isMirrored;
    mirrorBtn.classList.toggle('active', isMirrored);
    liveVideo.classList.toggle('mirror', isMirrored && facingMode === 'user');
  };
  mirrorBtn.onclick = updateMirror;

  const flipCam = () => {
    if (isRecording) return;
    facingMode = facingMode === 'user' ? 'environment' : 'user';
    startCamera(box);
  };
  $('#camFlipBtn', box).onclick = flipCam;
  $('#camFlipAuxBtn', box).onclick = flipCam;

  const setMode = mode => {
    if (isRecording) return;
    camMode = mode;
    modeTabs.forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
    shutterBtn.classList.toggle('video-mode', mode === 'video');
  };
  modeTabs.forEach(t => {
    t.onclick = () => setMode(t.dataset.mode);
  });

  oneViewToggle.onclick = () => {
    viewOnce = !viewOnce;
    oneViewToggle.classList.toggle('active', viewOnce);
    SoundFX?.play('toggle');
    updateSendButtonText();
  };

  const updateSendButtonText = () => {
    if (viewOnce) {
      sendBtnText.textContent = 'Send One-View';
    } else if (camMode === 'video' && capturedFile) {
      sendBtnText.textContent = 'Send Video';
    } else {
      sendBtnText.textContent = 'Send Media';
    }
  };

  const enterReviewUI = badgeText => {
    stageEl.classList.add('is-review');
    retakeBtn.disabled = false;
    sendBtn.disabled = false;
    modeBar.classList.add('hidden');
    controlsRow.classList.add('hidden');
    reviewBar.classList.remove('hidden');
    reviewBadgeText.textContent = badgeText;
    reviewBadge.classList.remove('hidden');
    updateSendButtonText();
  };

  shutterBtn.onclick = () => {
    if (camMode === 'photo') {
      snapPhoto();
    } else {
      toggleRecordVideo();
    }
  };

  const snapPhoto = () => {
    if (!liveVideo || !stream) return;
    SoundFX?.play('shutter');

    flashOverlay.classList.add('flashing');
    setTimeout(() => flashOverlay.classList.remove('flashing'), 280);

    const canvas = document.createElement('canvas');
    canvas.width = liveVideo.videoWidth || 1280;
    canvas.height = liveVideo.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    if (isMirrored && facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(liveVideo, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
      if (!blob) return;
      capturedFile = new File([blob], `camera-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      snapImg.src = URL.createObjectURL(blob);
      snapImg.classList.remove('hidden');
      liveVideo.classList.add('hidden');
      snapVideo.classList.add('hidden');
      enterReviewUI('Photo Ready');
    }, 'image/jpeg', 0.92);
  };

  const toggleRecordVideo = () => {
    if (!stream) return;

    if (isRecording) {
      isRecording = false;
      if (recTimer) { clearInterval(recTimer); recTimer = null; }
      shutterBtn.classList.remove('recording');
      recPill.classList.add('hidden');
      if (mediaRec && mediaRec.state === 'recording') {
        mediaRec.stop();
      }
      return;
    }

    recChunks = [];
    const mimeTypes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
    let selectedMime = '';
    for (const m of mimeTypes) {
      if (MediaRecorder.isTypeSupported(m)) { selectedMime = m; break; }
    }

    try {
      mediaRec = new MediaRecorder(stream, selectedMime ? { mimeType: selectedMime } : undefined);
    } catch {
      mediaRec = new MediaRecorder(stream);
    }

    mediaRec.ondataavailable = e => {
      if (e.data && e.data.size > 0) recChunks.push(e.data);
    };

    mediaRec.onstop = () => {
      const mime = mediaRec.mimeType || 'video/webm';
      const blob = new Blob(recChunks, { type: mime });
      capturedFile = new File([blob], `camera-video-${Date.now()}.webm`, { type: mime });

      snapVideo.src = URL.createObjectURL(blob);
      snapVideo.classList.remove('hidden');
      snapVideo.play().catch(() => {});
      liveVideo.classList.add('hidden');
      snapImg.classList.add('hidden');
      enterReviewUI(`Video Ready (${fmtTime(recSeconds)})`);
      toast('Video recorded — ready to send!');
    };

    recSeconds = 0;
    recTimerText.textContent = '00:00';
    recPill.classList.remove('hidden');
    shutterBtn.classList.add('recording');
    isRecording = true;
    SoundFX?.play('toggle');

    mediaRec.start(250);
    recTimer = setInterval(() => {
      recSeconds++;
      recTimerText.textContent = fmtTime(recSeconds);
      if (recSeconds >= 60) {
        toggleRecordVideo();
      }
    }, 1000);
  };

  retakeBtn.onclick = () => {
    capturedFile = null;
    sendBtn.disabled = true;
    retakeBtn.disabled = true;
    stageEl.classList.remove('is-review');
    reviewBar.classList.add('hidden');
    modeBar.classList.remove('hidden');
    controlsRow.classList.remove('hidden');
    reviewBadge.classList.add('hidden');
    snapImg.classList.add('hidden');
    snapVideo.classList.add('hidden');
    try { snapVideo.pause(); snapVideo.src = ''; } catch {}
    startCamera(box);
  };

  sendBtn.onclick = async () => {
    if (!capturedFile) return;
    const caption = $('#camCaptionIn', box).value.trim();
    const sendFile = capturedFile;
    const isOneView = viewOnce;

    sendBtn.disabled = true;
    sendBtn.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block"></span> Sending…`;

    closeCamOverlay();
    await uploadEncryptedFile(sendFile, { viewOnce: isOneView, caption, duration: recSeconds });
  };
}

// ---------------- Rich Attachment Modals ----------------
function handleAttachAction(act) {
  if (act === 'stickers') {
    openStickerGifDrawer('stickers');
    return;
  }
  const picker = $('#filePicker');
  if (act === 'media') {
    picker.accept = 'image/*,video/*';
    picker.multiple = true;
    picker.onchange = async () => {
      const files = Array.from(picker.files || []);
      picker.value = '';
      if (!files.length) return;
      await uploadMultipleEncryptedFiles(files);
    };
    picker.click();
    return;
  }
  if (act === 'camera') {
    openCameraModal();
  } else if (act === 'file') {
    picker.accept = '*/*';
    picker.multiple = true;
    picker.onchange = async () => {
      const files = Array.from(picker.files || []);
      picker.value = '';
      if (!files.length) return;
      await uploadMultipleEncryptedFiles(files);
    };
    picker.click();
  } else if (act === 'viewonce') {
    picker.accept = 'image/*,video/*';
    picker.onchange = () => {
      if (picker.files[0]) uploadEncryptedFile(picker.files[0], { viewOnce: true });
      picker.value = '';
    };
    picker.click();
  } else if (act === 'location') {
    openLocationModal();
  } else if (act === 'poll') {
    openPollModal();
  } else if (act === 'todo') {
    openTodoModal();
  }
}

function openLocationModal() {
  showModal('Share Location', `
    <label class="col gap-xs"><span class="muted">Place label</span><input id="locLabel" placeholder="Current location / cafe / office"></label>
    <div class="row gap-s">
      <label style="flex:1">Latitude<input id="locLat" type="number" step="any" value="28.6139"></label>
      <label style="flex:1">Longitude<input id="locLng" type="number" step="any" value="77.2090"></label>
    </div>
    <button class="btn ghost" id="gpsBtn">${icon('pin')} Use my device GPS</button>
    <label class="row gap-s"><input type="checkbox" id="locLive" style="width:auto" checked> <span>Stream Live Location (updates in real time)</span></label>
    <label class="col gap-xs"><span class="muted">Duration</span>
      <select id="locMin"><option value="15">15 minutes</option><option value="60">1 hour</option><option value="240">4 hours</option></select>
    </label>
    <button class="btn primary lg" id="sendLocBtn">Share location</button>
  `, box => {
    $('#gpsBtn', box).onclick = () => {
      navigator.geolocation?.getCurrentPosition(pos => {
        $('#locLat', box).value = pos.coords.latitude.toFixed(6);
        $('#locLng', box).value = pos.coords.longitude.toFixed(6);
        toast('GPS coordinates acquired');
      }, () => toast('Browser GPS unavailable — using entered coordinates', 'err'));
    };
    $('#gpsBtn', box).click();
    $('#sendLocBtn', box).onclick = async () => {
      const lat = parseFloat($('#locLat', box).value), lng = parseFloat($('#locLng', box).value);
      const label = $('#locLabel', box).value.trim() || 'Shared location';
      const isLive = $('#locLive', box).checked;
      const mins = +$('#locMin', box).value;
      closeModal();
      const m = await sendChatPayload(isLive ? 'live' : 'location', { lat, lng, label }, { liveMinutes: mins });
      if (isLive && m?.id) startLiveLocationStream(S.activeChatId, m.id, lat, lng, label);
    };
  });
}

function startLiveLocationStream(chatId, msgId, lat, lng, label) {
  if (!navigator.geolocation) return;
  const wid = navigator.geolocation.watchPosition(async pos => {
    const c = S.chats.get(chatId);
    if (!c) return;
    const key = await getChatKey(c, c.keyVersion);
    const box = await E2E.encryptJSON(key, { lat: pos.coords.latitude, lng: pos.coords.longitude, label });
    api(`/api/messages/${msgId}/live`, { method: 'POST', body: box }).catch(() => {});
  });
  S.liveWatchers.set(msgId, wid);
}

function stopLiveLocation(msgId) {
  const wid = S.liveWatchers.get(msgId);
  if (wid !== undefined) navigator.geolocation?.clearWatch(wid);
  S.liveWatchers.delete(msgId);
  api(`/api/messages/${msgId}/live`, { method: 'POST', body: { ended: true } });
}

function openPollModal() {
  showModal('Create Poll', `
    <label class="col gap-xs"><span class="muted">Question</span><input id="pollQ" placeholder="Where should we meet?"></label>
    <div id="pollOpts" class="col gap-s">
      <input placeholder="Option 1" class="poll-in">
      <input placeholder="Option 2" class="poll-in">
    </div>
    <button class="btn ghost sm" id="addOptBtn">+ Add option</button>
    <label class="row gap-s"><input type="checkbox" id="pollMulti" style="width:auto"> <span>Allow multiple answers</span></label>
    <button class="btn primary lg" id="sendPollBtn">Launch poll</button>
  `, box => {
    $('#addOptBtn', box).onclick = () => {
      const inp = document.createElement('input');
      inp.placeholder = `Option ${$$('.poll-in', box).length + 1}`;
      inp.className = 'poll-in';
      $('#pollOpts', box).appendChild(inp);
    };
    $('#sendPollBtn', box).onclick = async () => {
      const question = $('#pollQ', box).value.trim();
      const options = $$('.poll-in', box).map(i => i.value.trim()).filter(Boolean);
      if (!question || options.length < 2) return toast('Enter a question and at least 2 options', 'err');
      closeModal();
      await sendChatPayload('poll', { question, options }, { pollMulti: $('#pollMulti', box).checked });
    };
  });
}

function openTodoModal() {
  showModal('Shared To-Do List', `
    <label class="col gap-xs"><span class="muted">List title</span><input id="todoTitle" placeholder="Sprint Launch Checklist"></label>
    <div id="todoItems" class="col gap-s">
      <input placeholder="Task 1" class="todo-in">
      <input placeholder="Task 2" class="todo-in">
    </div>
    <button class="btn ghost sm" id="addTodoBtn">+ Add item</button>
    <p class="muted" style="font-size:12px">Anyone in this chat can tick or untick items in real time.</p>
    <button class="btn primary lg" id="sendTodoBtn">Share To-Do list</button>
  `, box => {
    $('#addTodoBtn', box).onclick = () => {
      const inp = document.createElement('input');
      inp.placeholder = `Task ${$$('.todo-in', box).length + 1}`;
      inp.className = 'todo-in';
      $('#todoItems', box).appendChild(inp);
    };
    $('#sendTodoBtn', box).onclick = async () => {
      const title = $('#todoTitle', box).value.trim();
      const items = $$('.todo-in', box).map((i, idx) => ({ id: `i${idx}_${Date.now().toString(36)}`, text: i.value.trim() })).filter(x => x.text);
      if (!title || !items.length) return toast('Enter a title and at least one task', 'err');
      closeModal();
      await sendChatPayload('todo', { title, items });
    };
  });
}

// ---------------- New DM / Group / FireCast Modals ----------------
async function openNewChatModal() {
  const users = await api('/api/users');
  users.forEach(u => S.users.set(u.id, u));

  // Determine contacts & friends: only users the current user has contacted or added as friend
  const contactUserIds = new Set();
  (S.user?.friends || []).forEach(fid => contactUserIds.add(fid));
  for (const ch of S.chats.values()) {
    if (ch.type === 'dm' && Array.isArray(ch.members)) {
      ch.members.forEach(mid => {
        if (mid && mid !== S.user.id) contactUserIds.add(mid);
      });
    }
  }

  showModal('New Conversation', `
    <div class="new-convo-fullpage-wrap">
      <div class="nc-seg-wrapper">
        <div class="seg" id="ncSeg">
          <button class="active" data-t="dm">Direct Message</button>
          <button data-t="group">Group</button>
        </div>
      </div>
      <div id="ncDm" class="col gap-s" style="flex:1;min-height:0;display:flex;flex-direction:column;">
        <div class="nc-input-wrap">
          <i data-icon="search" class="nc-input-icon"></i>
          <input id="ncFilter" class="nc-input nc-search-input" placeholder="Type name or @username to search people…">
        </div>
        <div id="ncUserList" class="col gap-xs" style="flex:1;overflow-y:auto;padding-right:4px;"></div>
      </div>
      <div id="ncGroup" class="col gap-m hidden" style="flex:1;min-height:0;overflow-y:auto;padding-bottom:12px;">
        <div class="nc-group-card">
          <div class="nc-field-group">
            <label class="nc-field-label">Group Name &amp; Icon</label>
            <div class="row gap-s align-center">
              <input id="grpEmoji" class="nc-emoji-input" value="🚀" title="Group emoji avatar" maxlength="2">
              <input id="grpName" class="nc-input" placeholder="Group name (e.g. Core Team)" style="flex:1">
            </div>
          </div>
          <div class="nc-field-group">
            <label class="nc-field-label">Description (Optional)</label>
            <input id="grpDesc" class="nc-input" placeholder="What is this group about?">
          </div>
        </div>

        <div class="nc-group-card">
          <div class="row between align-center" style="margin-bottom:8px">
            <label class="nc-field-label" style="margin:0">Add Members</label>
            <span id="grpSelectedCount" class="pill purple xs">0 selected</span>
          </div>
          <div class="nc-input-wrap">
            <i data-icon="search" class="nc-input-icon"></i>
            <input id="grpMemberSearch" class="nc-input nc-search-input" placeholder="Type @username to find members…">
          </div>

          <div class="nc-section-subhead" id="grpSectionLabel">Contacts &amp; Friends:</div>
          <div id="grpMembers" class="col gap-xs nc-members-scroll"></div>
        </div>

        <button class="btn primary lg nc-create-btn" id="createGrpBtn">Create Group</button>
      </div>
    </div>
  `, box => {
    // Add custom class to modal for fullscreen sizing
    const modalEl = box.closest('.modal');
    if (modalEl) {
      modalEl.classList.add('modal-fullscreen', 'modal-new-convo');
    }
    hydrateIcons(box);

    $$('#ncSeg button', box).forEach(b => b.onclick = () => {
      $$('#ncSeg button', box).forEach(x => x.classList.toggle('active', x === b));
      $('#ncDm', box).classList.toggle('hidden', b.dataset.t !== 'dm');
      $('#ncGroup', box).classList.toggle('hidden', b.dataset.t !== 'group');
    });

    let dmSearchTimer = null;
    let dmSearchSeq = 0;

    const renderPeople = (rawQuery, skipRemoteFetch = false) => {
      const container = $('#ncUserList', box);
      const rawTrimmed = String(rawQuery || '').trim();
      const q = rawTrimmed.toLowerCase().replace(/^@+/, '');
      if (!q) {
        // Do not dump random users! Prompt the user to type
        container.innerHTML = `
          <div class="no-content-box new-convo-glass-card" style="margin:40px auto;max-width:360px;text-align:center;padding:28px 24px;">
            <div class="nc-ico" style="margin-bottom:12px;display:inline-flex;padding:14px;border-radius:16px;background:rgba(124,92,255,0.16);color:#a78bfa;">${icon('search')}</div>
            <h4 style="font-size:16px;font-weight:700;margin-bottom:6px;">Find People on Zovio</h4>
            <p class="muted" style="font-size:13px;line-height:1.5;">Type a username, handle, or contact name above to start a conversation.</p>
          </div>
        `;
        return;
      }

      // Filter and limit to 50-70 users per search page
      const matches = users
        .filter(u => {
          if (!u || u.id === S.user.id) return false;
          const uname = (u.username || '').toLowerCase().replace(/^@+/, '');
          const name = (u.name || '').toLowerCase();
          return name.includes(q) || uname.includes(q);
        })
        .slice(0, 60);

      container.innerHTML = matches.map(u => `
        <div class="chat-row" data-uid="${u.id}" style="padding:10px 14px;border-radius:14px;">
          ${avatarHTML(u, 'md')}
          <div style="flex:1;min-width:0;">
            <strong style="font-size:14px;color:var(--text-0);">${esc(u.name)}</strong>
            <div class="muted" style="font-size:12px;">@${esc(u.username || '')} ${u.bio ? `· ${esc(u.bio)}` : ''}</div>
          </div>
          <span class="btn primary sm" style="padding:6px 16px;border-radius:10px;font-weight:700;">Chat</span>
        </div>
      `).join('') || `
        <div class="no-content-box" style="margin:40px auto;text-align:center;">
          <h4 style="font-size:15px;color:var(--text-0);">No users found</h4>
          <p class="muted" style="font-size:12.5px;">No matches for "${esc(rawTrimmed)}". Check the username or spelling.</p>
        </div>
      `;

      $$('#ncUserList [data-uid]', box).forEach(el => el.onclick = async () => {
        const other = S.users.get(el.dataset.uid);
        const { keys } = await wrapNewChatKey([S.user, other]);
        const chat = await api('/api/chats/dm', { method: 'POST', body: { userId: other.id, keys } });
        S.chats.set(chat.id, chat);
        closeModal();
        openChat(chat.id);
      });

      // Fallback live server query if not found locally or initial user list hit cap
      if (!skipRemoteFetch && (!matches.length || users.length >= 50)) {
        clearTimeout(dmSearchTimer);
        const seq = ++dmSearchSeq;
        dmSearchTimer = setTimeout(async () => {
          try {
            const remote = await api('/api/users?q=' + encodeURIComponent(q));
            if (seq !== dmSearchSeq || !document.body.contains(box)) return;
            let added = false;
            for (const ru of remote || []) {
              if (ru && ru.id) {
                S.users.set(ru.id, ru);
                if (!users.some(x => x.id === ru.id)) {
                  users.push(ru);
                  added = true;
                }
              }
            }
            if (added) renderPeople($('#ncFilter', box)?.value || rawTrimmed, true);
          } catch {}
        }, 160);
      }
    };
    renderPeople('', true);
    $('#ncFilter', box).oninput = e => renderPeople(e.target.value);

    // Selected member tracking for Group tab
    const selectedMemberIds = new Set();

    const renderGroupMembers = (filterQuery = '') => {
      const q = filterQuery.trim().toLowerCase().replace(/^@/, '');
      const membersBox = $('#grpMembers', box);
      const labelEl = $('#grpSectionLabel', box);
      if (!membersBox) return;

      let visibleUsers = [];
      if (q) {
        if (labelEl) labelEl.textContent = `Search results for "${filterQuery.trim()}":`;
        visibleUsers = users.filter(u => {
          if (u.id === S.user.id) return false;
          const uname = (u.username || '').toLowerCase();
          const unameClean = uname.replace(/^@/, '');
          const name = (u.name || '').toLowerCase();
          return uname.includes(q) || unameClean.includes(q) || name.includes(q) || selectedMemberIds.has(u.id);
        });
      } else {
        if (labelEl) labelEl.textContent = 'Contacts & Friends:';
        visibleUsers = users.filter(u => {
          if (u.id === S.user.id) return false;
          return contactUserIds.has(u.id) || selectedMemberIds.has(u.id);
        });
      }

      if (!visibleUsers.length) {
        membersBox.innerHTML = `
          <div class="nc-empty-notice">
            ${q ? `No users found matching "<b>${esc(filterQuery.trim())}</b>".` : 'No recent contacts or friends found.'}
            <div class="nc-empty-sub">${q ? 'Check the spelling or enter their exact @username.' : 'Type an exact @username above to search and add members!'}</div>
          </div>`;
        return;
      }

      membersBox.innerHTML = visibleUsers.map(u => {
        const isChecked = selectedMemberIds.has(u.id);
        const isContact = contactUserIds.has(u.id);
        return `
          <label class="nc-member-item ${isChecked ? 'selected' : ''}">
            <input type="checkbox" data-grp-uid="${u.id}" ${isChecked ? 'checked' : ''} class="nc-member-cb">
            ${avatarHTML(u, 'sm')}
            <div style="flex:1;min-width:0;overflow:hidden">
              <div class="row items-center gap-xs">
                <strong class="nc-member-name">${esc(u.name)}</strong>
                ${isContact ? '<span class="pill xs" style="background:rgba(124,92,255,0.18);color:#a78bfa;font-weight:700">Contact</span>' : ''}
              </div>
              <small class="muted" style="font-size:11.5px">@${esc(u.username)}</small>
            </div>
          </label>
        `;
      }).join('');

      $$('input[data-grp-uid]', membersBox).forEach(cb => {
        cb.onchange = e => {
          const uid = cb.dataset.grpUid;
          if (e.target.checked) {
            selectedMemberIds.add(uid);
          } else {
            selectedMemberIds.delete(uid);
          }
          const cntEl = $('#grpSelectedCount', box);
          if (cntEl) cntEl.textContent = `${selectedMemberIds.size} selected`;
          const parentLabel = cb.closest('.nc-member-item');
          if (parentLabel) parentLabel.classList.toggle('selected', e.target.checked);
        };
      });
    };

    renderGroupMembers('');

    $('#grpMemberSearch', box).oninput = e => {
      renderGroupMembers(e.target.value);
    };

    $('#createGrpBtn', box).onclick = async () => {
      const name = $('#grpName', box).value.trim();
      if (!name) return toast('Group name is required', 'err');
      const memberIds = Array.from(selectedMemberIds);
      const memberObjs = [S.user, ...memberIds.map(id => S.users.get(id)).filter(Boolean)];
      const { keys } = await wrapNewChatKey(memberObjs);
      const chat = await api('/api/chats/group', {
        method: 'POST',
        body: { name, emoji: $('#grpEmoji', box).value.trim() || '👥', description: $('#grpDesc', box).value.trim(), memberIds, keys }
      });
      S.chats.set(chat.id, chat);
      closeModal();
      openChat(chat.id);
    };
  });
}

function openNewChannelModal() {
  showModal('🔥 Launch a ZovioCast', `
    <div class="row gap-s">
      <input id="chEmoji" value="🌶️" style="width:58px;text-align:center;font-size:20px">
      <input id="chName" placeholder="ZovioCast title (e.g. Spicy Design Drops)">
    </div>
    <label class="col gap-xs"><span class="muted">Public handle</span><input id="chHandle" placeholder="spicydesign"></label>
    <label class="col gap-xs"><span class="muted">About this channel</span><textarea id="chDesc" rows="2" placeholder="What will followers get?"></textarea></label>
    <button class="btn primary lg" id="createChBtn">Launch ZovioCast</button>
  `, box => {
    $('#createChBtn', box).onclick = async () => {
      try {
        const ch = await api('/api/channels', {
          method: 'POST',
          body: { name: $('#chName', box).value, handle: $('#chHandle', box).value, description: $('#chDesc', box).value, emoji: $('#chEmoji', box).value }
        });
        S.chats.set(ch.id, ch);
        closeModal();
        openChat(ch.id);
      } catch (e) {
        toast(e.message, 'err');
      }
    };
  });
}

async function toggleFollowChannel(c) {
  const updated = await api(`/api/channels/${c.id}/follow`, { method: 'POST', body: { follow: !c.isFollowing } });
  S.chats.set(updated.id, updated);
  renderChatList();
  renderConvoShell();
  renderMessages();
}

// ---------------- Shared Media Hub Modal ----------------
function openSharedMediaModal(c) {
  const msgs = S.msgs.get(c.id) || [];
  const photos = msgs.filter(m => !m.deleted && !isViewOnceMsg(m) && (m.kind === 'image' || (m._plain?.mime || '').startsWith('image/')));
  const videos = msgs.filter(m => !m.deleted && !isViewOnceMsg(m) && (m.kind === 'video' || (m._plain?.mime || '').startsWith('video/')));
  const docs = msgs.filter(m => !m.deleted && !isViewOnceMsg(m) && (m.kind === 'file' || m.kind === 'audio'));
  const links = [];
  msgs.forEach(m => {
    if (m.deleted) return;
    const txt = m._plain?.text || m.body?.text || (typeof m.body === 'string' ? m.body : '') || '';
    const found = txt.match(/https?:\/\/[^\s]+/gi);
    if (found) {
      found.forEach(url => links.push({ url, text: txt, ts: m.ts }));
    }
  });

  showModal(`<span class="modal-title-ico" style="color:#a78bfa">${icon('image')}</span> <span>All Media</span>`, `
    <div class="seg media-tabs-seg" id="mediaTabsSeg">
      <button type="button" class="active" data-tab="photos">${icon('image')} <span>Photos (${photos.length})</span></button>
      <button type="button" data-tab="videos">${icon('video')} <span>Videos (${videos.length})</span></button>
      <button type="button" data-tab="docs">${icon('file')} <span>Docs (${docs.length})</span></button>
      <button type="button" data-tab="links">${icon('link')} <span>Links (${links.length})</span></button>
    </div>
    <div id="mediaTabContent" class="media-hub-content"></div>
  `, box => {
    function renderTab(tab) {
      $$('#mediaTabsSeg button', box).forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
      const content = $('#mediaTabContent', box);
      if (tab === 'photos') {
        if (!photos.length) {
          content.innerHTML = `<div class="empty-inline-card"><div class="empty-inline-ico" style="color:#a78bfa">${icon('image')}</div><div><strong>No photos in this chat</strong><div class="muted" style="font-size:12px">Photos you or contacts send will appear here.</div></div></div>`;
          return;
        }
        content.innerHTML = `<div class="media-grid-photos">${photos.map(m => {
          const p = m._plain || m.body || {};
          const cached = blobCache.get(m.id);
          return `<div class="media-photo-thumb" data-mid="${m.id}" title="${esc(p.name || 'Photo')} · ${fmtTime(m.ts)}">
            ${cached
              ? `<img src="${cached}" alt="${esc(p.name || 'Photo')}">`
              : `<div class="media-photo-placeholder"><div class="media-ico-badge">${icon('image')}</div><span class="media-file-label">${esc(p.name || 'Photo')}</span><small class="media-file-time">${fmtTime(m.ts)}</small></div>`}
          </div>`;
        }).join('')}</div>`;
        // Lazily hydrate encrypted photo thumbnails into view
        photos.forEach(m => {
          if (blobCache.has(m.id)) return;
          const p = m._plain || m.body || {};
          if (!p.fileId || !p.fileKey) return;
          fetchDecryptedBlob(m).then(url => {
            if (!url || !content.isConnected) return;
            const thumbEl = content.querySelector(`.media-photo-thumb[data-mid="${m.id}"]`);
            if (thumbEl) {
              thumbEl.innerHTML = `<img src="${url}" alt="${esc(p.name || 'Photo')}">`;
            }
          }).catch(() => {});
        });
        $$('.media-photo-thumb', content).forEach(el => {
          el.onclick = () => {
            const m = photos.find(x => x.id === el.dataset.mid);
            if (m) openWhatsAppMediaLightbox(m.id);
          };
        });
      } else if (tab === 'videos') {
        if (!videos.length) {
          content.innerHTML = `<div class="empty-inline-card"><div class="empty-inline-ico" style="color:#a78bfa">${icon('video')}</div><div><strong>No videos in this chat</strong><div class="muted" style="font-size:12px">Videos sent in this chat will appear here.</div></div></div>`;
          return;
        }
        content.innerHTML = `<div class="media-grid-videos">${videos.map(m => {
          const p = m._plain || m.body || {};
          const cached = blobCache.get(m.id);
          return `<div class="media-video-thumb" data-mid="${m.id}">
            ${cached ? renderCustomVideoPlayer(cached, { compact: true }) : `<div class="media-video-placeholder"><div class="media-ico-badge">${icon('video')}</div><span style="font-size:12px;font-weight:600">${esc(p.name || 'Video')}</span><button type="button" class="btn primary sm" style="margin-top:6px">Open</button></div>`}
            <div class="row between" style="padding:6px 8px;font-size:11px"><span class="muted">${fmtTime(m.ts)}</span><span class="muted">${fmtBytes(p.size || 0)}</span></div>
          </div>`;
        }).join('')}</div>`;
        initCustomVideoPlayers(content);
        $$('.media-video-thumb, .media-video-placeholder button', content).forEach(b => {
          const parent = b.closest('.media-video-thumb');
          b.onclick = () => parent && openWhatsAppMediaLightbox(parent.dataset.mid);
        });
      } else if (tab === 'docs') {
        if (!docs.length) {
          content.innerHTML = `<div class="empty-inline-card"><div class="empty-inline-ico" style="color:#a78bfa">${icon('file')}</div><div><strong>No documents in this chat</strong><div class="muted" style="font-size:12px">PDFs, archives and files will appear here.</div></div></div>`;
          return;
        }
        content.innerHTML = `<div class="col gap-s">${docs.map(m => {
          const p = m._plain || m.body || {};
          return `<div class="media-doc-row">
            <div class="row gap-s" style="align-items:center;min-width:0;flex:1">
              <div class="media-ico-badge sm">${icon('file')}</div>
              <div style="min-width:0;flex:1">
                <div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.name || 'Document')}</div>
                <small class="muted">${fmtBytes(p.size || 0)} · ${fmtTime(m.ts)}</small>
              </div>
            </div>
            <button type="button" class="btn primary sm" data-dldoc="${m.id}">${icon('download')} Download</button>
          </div>`;
        }).join('')}</div>`;
        $$('[data-dldoc]', content).forEach(b => b.onclick = () => downloadAttachment(c, b.dataset.dldoc));
      } else if (tab === 'links') {
        if (!links.length) {
          content.innerHTML = `<div class="empty-inline-card"><div class="empty-inline-ico" style="color:#a78bfa">${icon('link')}</div><div><strong>No links in this chat</strong><div class="muted" style="font-size:12px">Shared web links will appear here.</div></div></div>`;
          return;
        }
        content.innerHTML = `<div class="col gap-s">${links.map(l => `
          <div class="media-doc-row">
            <div class="row gap-s" style="align-items:center;min-width:0;flex:1">
              <div class="media-ico-badge sm">${icon('link')}</div>
              <div style="min-width:0;flex:1">
                <a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer" style="font-weight:700;font-size:13px;color:#a78bfa;word-break:break-all">${esc(l.url)}</a>
                <div class="muted" style="font-size:11.5px;margin-top:2px">${esc(l.text.length > 70 ? l.text.slice(0, 70) + '…' : l.text)} · ${fmtTime(l.ts)}</div>
              </div>
            </div>
            <a class="btn ghost sm" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">Open</a>
          </div>
        `).join('')}</div>`;
      }
    }

    $$('#mediaTabsSeg button', box).forEach(b => b.onclick = () => renderTab(b.dataset.tab));
    renderTab('photos');
  }, 'modal-all-media');
}

// ---------------- Starred Content Hub Modal ----------------
function fmtStarredFullTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  return `${dateStr} · ${timeStr}`;
}

function getStarredDayKey(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getStarredDayTitle(ts) {
  if (!ts) return 'Unknown Date';
  const d = new Date(ts);
  const now = new Date();
  const todayKey = getStarredDayKey(now.getTime());
  const itemKey = getStarredDayKey(ts);
  if (itemKey === todayKey) {
    return `Today · ${d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (itemKey === getStarredDayKey(yesterday.getTime())) {
    return `Yesterday · ${d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function getStarredItemCategory(m) {
  const p = m._plain || m.body || {};
  const mime = p.mime || '';
  const name = p.name || '';
  const txt = typeof m.body === 'string' ? m.body : (p.text || '');
  if (m.kind === 'image' || mime.startsWith('image/')) return 'photos';
  if (m.kind === 'video' || mime.startsWith('video/')) return 'videos';
  if (m.kind === 'file' || mime.includes('pdf') || /\.(pdf|docx?|xlsx?|pptx?|txt|csv|zip|tar|gz)$/i.test(name)) return 'docs';
  if (/https?:\/\/[^\s]+/i.test(txt)) return 'links';
  return 'chats';
}

function openStarredContentModal(c) {
  let activeTab = 'all';
  let datePreset = 'all'; // 'all' | 'today' | 'week' | 'month'
  let specificDate = '';  // 'YYYY-MM-DD'
  let searchQuery = '';
  let sortOrder = 'desc'; // 'desc' (newest first) | 'asc' (oldest first)

  function getStarredMessages() {
    const all = S.msgs.get(c.id) || [];
    return all.filter(m => !m.deleted && (m.starredBy || []).includes(S.user.id));
  }

  showModal(`<span class="modal-title-ico" style="color:#fbbf24">${icon('starFill')}</span> <span>Starred Content</span>`, `
    <div class="starred-modal-wrap">
      <!-- Search, Custom Date Picker & Sort Controls -->
      <div class="starred-controls-bar">
        <div class="starred-search-wrap">
          <span class="starred-search-ico">${icon('search')}</span>
          <input type="text" id="starredSearchInput" class="input sm" placeholder="Search starred chats, media, files...">
        </div>
        <div class="starred-date-picker-wrap">
          <button type="button" id="starredDateBtn" class="starred-date-btn" title="Filter by specific date">
            ${icon('calendar')}
            <span id="starredDateLabel">Select Date</span>
          </button>
          <button type="button" id="starredDateClear" class="icon-btn xs" title="Clear date filter" style="display:none">${icon('close')}</button>
          <div id="starredDatePopover" class="custom-date-popover hidden"></div>
        </div>
        <button type="button" id="starredSortBtn" class="btn ghost sm starred-sort-btn" title="Toggle date sorting">
          <span id="starredSortLabel">↓ Newest</span>
        </button>
      </div>

      <!-- Quick Date Range Presets -->
      <div class="starred-presets-row" id="starredPresetsRow">
        <button type="button" class="starred-preset-pill active" data-preset="all">All Time</button>
        <button type="button" class="starred-preset-pill" data-preset="today">Today</button>
        <button type="button" class="starred-preset-pill" data-preset="week">This Week</button>
        <button type="button" class="starred-preset-pill" data-preset="month">This Month</button>
      </div>

      <!-- Category Filter Tabs -->
      <div class="seg starred-cat-seg" id="starredCatSeg">
        <button type="button" class="active" data-cat="all">${icon('sparkles')} <span>All (<span id="catCountAll">0</span>)</span></button>
        <button type="button" data-cat="chats">${icon('chat')} <span>Chats (<span id="catCountChats">0</span>)</span></button>
        <button type="button" data-cat="photos">${icon('image')} <span>Photos (<span id="catCountPhotos">0</span>)</span></button>
        <button type="button" data-cat="videos">${icon('video')} <span>Videos (<span id="catCountVideos">0</span>)</span></button>
        <button type="button" data-cat="docs">${icon('file')} <span>Docs (<span id="catCountDocs">0</span>)</span></button>
        <button type="button" data-cat="links">${icon('link')} <span>Links (<span id="catCountLinks">0</span>)</span></button>
      </div>

      <!-- Dynamic Content Area -->
      <div id="starredContentList" class="starred-content-scroll"></div>
    </div>
  `, box => {
    const listEl = $('#starredContentList', box);
    const searchInp = $('#starredSearchInput', box);
    const dateBtn = $('#starredDateBtn', box);
    const dateLabel = $('#starredDateLabel', box);
    const dateClear = $('#starredDateClear', box);
    const datePopover = $('#starredDatePopover', box);
    const sortBtn = $('#starredSortBtn', box);
    const sortLabel = $('#starredSortLabel', box);

    // Custom Calendar Date Picker State & Renderer
    let calViewDate = new Date();
    const formatDateLabel = (iso) => {
      if (!iso) return 'Select Date';
      const [y, m, d] = iso.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    };
    const renderDatePopover = () => {
      if (!datePopover) return;
      const year = calViewDate.getFullYear();
      const month = calViewDate.getMonth();
      const monthName = calViewDate.toLocaleDateString([], { month: 'long', year: 'numeric' });
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const todayIso = getStarredDayKey(Date.now());

      let cells = '';
      for (let i = 0; i < firstDay; i++) cells += `<span class="cdp-empty"></span>`;
      for (let d = 1; d <= daysInMonth; d++) {
        const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isSel = specificDate === iso;
        const isToday = todayIso === iso;
        cells += `<button type="button" class="cdp-day ${isSel ? 'selected' : ''} ${isToday ? 'today' : ''}" data-iso="${iso}">${d}</button>`;
      }

      datePopover.innerHTML = `
        <div class="cdp-head">
          <button type="button" class="cdp-nav" data-dir="-1">‹</button>
          <span class="cdp-month">${monthName}</span>
          <button type="button" class="cdp-nav" data-dir="1">›</button>
        </div>
        <div class="cdp-weekdays"><span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span></div>
        <div class="cdp-grid">${cells}</div>
        <div class="cdp-foot">
          <button type="button" class="cdp-foot-btn" id="cdpTodayBtn">Today</button>
          <button type="button" class="cdp-foot-btn" id="cdpClearBtn">Clear</button>
        </div>
      `;

      datePopover.querySelectorAll('.cdp-nav').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          calViewDate.setMonth(calViewDate.getMonth() + Number(btn.dataset.dir));
          renderDatePopover();
        };
      });
      datePopover.querySelectorAll('.cdp-day').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          specificDate = btn.dataset.iso;
          if (dateLabel) dateLabel.textContent = formatDateLabel(specificDate);
          dateBtn?.classList.add('has-date');
          if (dateClear) dateClear.style.display = 'inline-flex';
          $$('#starredPresetsRow .starred-preset-pill', box).forEach(p => p.classList.remove('active'));
          datePopover.classList.add('hidden');
          renderStarred();
        };
      });
      datePopover.querySelector('#cdpTodayBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        specificDate = todayIso;
        if (dateLabel) dateLabel.textContent = formatDateLabel(specificDate);
        dateBtn?.classList.add('has-date');
        if (dateClear) dateClear.style.display = 'inline-flex';
        $$('#starredPresetsRow .starred-preset-pill', box).forEach(p => p.classList.remove('active'));
        datePopover.classList.add('hidden');
        renderStarred();
      });
      datePopover.querySelector('#cdpClearBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        specificDate = '';
        if (dateLabel) dateLabel.textContent = 'Select Date';
        dateBtn?.classList.remove('has-date');
        if (dateClear) dateClear.style.display = 'none';
        datePopover.classList.add('hidden');
        renderStarred();
      });
    };

    if (dateBtn && datePopover) {
      dateBtn.onclick = (e) => {
        e.stopPropagation();
        renderDatePopover();
        datePopover.classList.toggle('hidden');
      };
      box.addEventListener('click', (e) => {
        if (!e.target.closest('.starred-date-picker-wrap')) {
          datePopover.classList.add('hidden');
        }
      });
    }

    function renderStarred() {
      const allStarred = getStarredMessages();

      // Update counts for each tab
      const counts = {
        all: allStarred.length,
        chats: 0,
        photos: 0,
        videos: 0,
        docs: 0,
        links: 0
      };
      allStarred.forEach(m => {
        const cat = getStarredItemCategory(m);
        counts[cat] = (counts[cat] || 0) + 1;
        const txt = m._plain?.text || m.body?.text || (typeof m.body === 'string' ? m.body : '') || '';
        if (cat !== 'links' && /https?:\/\/[^\s]+/i.test(txt)) {
          counts.links = (counts.links || 0) + 1;
        }
      });
      if ($('#catCountAll', box)) $('#catCountAll', box).textContent = counts.all;
      if ($('#catCountChats', box)) $('#catCountChats', box).textContent = counts.chats;
      if ($('#catCountPhotos', box)) $('#catCountPhotos', box).textContent = counts.photos;
      if ($('#catCountVideos', box)) $('#catCountVideos', box).textContent = counts.videos;
      if ($('#catCountDocs', box)) $('#catCountDocs', box).textContent = counts.docs;
      if ($('#catCountLinks', box)) $('#catCountLinks', box).textContent = counts.links;

      // Filter by Category
      let filtered = allStarred.filter(m => {
        if (activeTab === 'all') return true;
        const cat = getStarredItemCategory(m);
        if (activeTab === 'links') {
          const txt = m._plain?.text || m.body?.text || (typeof m.body === 'string' ? m.body : '') || '';
          return cat === 'links' || /https?:\/\/[^\s]+/i.test(txt);
        }
        return cat === activeTab;
      });

      // Filter by Date Preset or Specific Date
      const now = new Date();
      if (specificDate) {
        filtered = filtered.filter(m => getStarredDayKey(m.ts) === specificDate);
      } else if (datePreset === 'today') {
        const todayKey = getStarredDayKey(now.getTime());
        filtered = filtered.filter(m => getStarredDayKey(m.ts) === todayKey);
      } else if (datePreset === 'week') {
        const weekAgo = now.getTime() - 7 * 86400000;
        filtered = filtered.filter(m => (m.ts || 0) >= weekAgo);
      } else if (datePreset === 'month') {
        const monthAgo = now.getTime() - 30 * 86400000;
        filtered = filtered.filter(m => (m.ts || 0) >= monthAgo);
      }

      // Filter by Keyword Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(m => {
          const p = m._plain || m.body || {};
          const txt = (p.text || (typeof m.body === 'string' ? m.body : '') || '').toLowerCase();
          const name = (p.name || '').toLowerCase();
          const sender = (S.users.get(m.senderId)?.name || (m.senderId === S.user.id ? 'You' : '')).toLowerCase();
          return txt.includes(q) || name.includes(q) || sender.includes(q);
        });
      }

      // Sort
      filtered.sort((a, b) => {
        const ta = a.ts || 0;
        const tb = b.ts || 0;
        return sortOrder === 'desc' ? tb - ta : ta - tb;
      });

      // Empty states
      if (!allStarred.length) {
        listEl.innerHTML = `
          <div class="empty-inline-card starred-empty">
            <div class="empty-inline-ico" style="color:#f59e0b">${icon('starFill')}</div>
            <div>
              <strong>No starred content in this chat yet</strong>
              <div class="muted" style="font-size:12.5px;margin-top:4px">
                Hover over any message or media in the conversation and click the star icon to save it here.
              </div>
            </div>
          </div>`;
        return;
      }

      if (!filtered.length) {
        listEl.innerHTML = `
          <div class="empty-inline-card starred-empty">
            <div class="empty-inline-ico" style="color:#a78bfa">${icon('search')}</div>
            <div>
              <strong>No results match your filters</strong>
              <div class="muted" style="font-size:12.5px;margin-top:4px">
                Try selecting "All Time" or adjusting your search keyword and date range.
              </div>
              <button type="button" class="btn ghost sm" id="starredResetFilterBtn" style="margin-top:10px">Reset Filters</button>
            </div>
          </div>`;
        const resetBtn = $('#starredResetFilterBtn', listEl);
        if (resetBtn) {
          resetBtn.onclick = () => {
            activeTab = 'all';
            datePreset = 'all';
            specificDate = '';
            searchQuery = '';
            if (searchInp) searchInp.value = '';
            if (dateLabel) dateLabel.textContent = 'Select Date';
            dateBtn?.classList.remove('has-date');
            if (dateClear) dateClear.style.display = 'none';
            $$('#starredPresetsRow button', box).forEach(b => b.classList.toggle('active', b.dataset.preset === 'all'));
            $$('#starredCatSeg button', box).forEach(b => b.classList.toggle('active', b.dataset.cat === 'all'));
            renderStarred();
          };
        }
        return;
      }

      // Group by Day
      const groups = new Map();
      filtered.forEach(m => {
        const dayLabel = getStarredDayTitle(m.ts);
        if (!groups.has(dayLabel)) groups.set(dayLabel, []);
        groups.get(dayLabel).push(m);
      });

      let html = '';
      for (const [dayLabel, items] of groups.entries()) {
        html += `<div class="starred-day-sep"><span>${esc(dayLabel)}</span></div>`;
        items.forEach(m => {
          const isMe = m.senderId === S.user.id;
          const u = isMe ? S.user : (S.users.get(m.senderId) || chatDisplay(c).peer || {});
          const authorName = isMe ? 'You' : (u.name || 'User');
          const p = m._plain || m.body || {};
          const cat = getStarredItemCategory(m);
          const cached = blobCache.get(m.id);
          const txt = typeof m.body === 'string' ? m.body : (p.text || '');

          let bodyHTML = '';
          if (cat === 'photos') {
            bodyHTML = `
              <div class="starred-media-box">
                ${cached
                  ? `<div class="starred-media-img-wrap" data-previewphoto="${m.id}"><img src="${cached}" alt="${esc(p.name || 'Photo')}"></div>`
                  : `<div class="starred-media-ph">${icon('image')}<span>${esc(p.name || 'Photo')}</span></div>`
                }
                <div class="starred-media-meta">
                  <span class="starred-media-name">${esc(p.name || 'Photo')}</span>
                  <span class="muted">${fmtBytes(p.size || 0)}</span>
                  <button type="button" class="btn primary xs" data-dldoc="${m.id}">${icon('download')} Download</button>
                </div>
              </div>`;
          } else if (cat === 'videos') {
            bodyHTML = `
              <div class="starred-media-box video">
                ${cached
                  ? `<div class="starred-video-player-wrap">${renderCustomVideoPlayer(cached, { compact: true })}</div>`
                  : `<div class="starred-media-ph">${icon('video')}<span>${esc(p.name || 'Video')}</span><button type="button" class="btn primary xs" data-dldoc="${m.id}" style="margin-top:6px">${icon('download')} Download</button></div>`
                }
                <div class="starred-media-meta">
                  <span class="starred-media-name">${esc(p.name || 'Video')}</span>
                  <span class="muted">${fmtBytes(p.size || 0)}</span>
                </div>
              </div>`;
          } else if (cat === 'docs') {
            bodyHTML = `
              <div class="starred-doc-row">
                <div class="starred-doc-icon">${icon('file')}</div>
                <div class="starred-doc-info">
                  <div class="starred-doc-name" title="${esc(p.name || 'Document')}">${esc(p.name || 'Document')}</div>
                  <div class="muted" style="font-size:11.5px">${fmtBytes(p.size || 0)} · ${esc(p.mime || 'application/octet-stream')}</div>
                </div>
                <button type="button" class="btn primary xs" data-dldoc="${m.id}">${icon('download')} Download</button>
              </div>`;
          } else if (cat === 'links') {
            const urls = (txt.match(/https?:\/\/[^\s]+/gi) || []);
            const mainUrl = urls[0] || '';
            bodyHTML = `
              <div class="starred-link-row">
                <div class="starred-link-icon">🔗</div>
                <div class="starred-link-info">
                  <a href="${esc(mainUrl)}" target="_blank" rel="noopener noreferrer" class="starred-link-url">${esc(mainUrl)}</a>
                  <div class="muted" style="font-size:11.5px;margin-top:2px">${esc(txt.length > 80 ? txt.slice(0, 80) + '…' : txt)}</div>
                </div>
                <a href="${esc(mainUrl)}" target="_blank" rel="noopener noreferrer" class="btn ghost xs">Open ↗</a>
              </div>`;
          } else {
            // Text chats, polls, audio
            if (m.kind === 'poll') {
              bodyHTML = `<div class="starred-poll-badge">${icon('poll')} Poll: <strong>${esc(p.question || 'Poll Question')}</strong></div>`;
            } else if (m.kind === 'audio') {
              bodyHTML = `
                <div class="starred-doc-row">
                  <div class="starred-doc-icon">${icon('mic')}</div>
                  <div class="starred-doc-info">
                    <div class="starred-doc-name">Voice Note</div>
                    <div class="muted" style="font-size:11.5px">${fmtBytes(p.size || 0)}</div>
                  </div>
                  <button type="button" class="btn primary xs" data-dldoc="${m.id}">${icon('download')} Listen</button>
                </div>`;
            } else {
              const formatted = highlightMatches(txt, searchQuery).replace(/(https?:\/\/[^\s<]+)/gi, '<a href="$1" target="_blank" rel="noopener noreferrer" class="chat-link" onclick="event.stopPropagation()">$1</a>');
              bodyHTML = `<div class="starred-text-msg">${formatted}</div>`;
            }
          }

          html += `
            <div class="starred-card" data-mid="${m.id}">
              <div class="starred-card-top">
                <div class="starred-card-user">
                  ${avatarHTML(u.avatar, 'xs')}
                  <div class="col" style="gap:1px;min-width:0">
                    <span class="starred-card-name">${esc(authorName)}</span>
                    <span class="starred-card-time" title="${fmtStarredFullTime(m.ts)}">${fmtStarredFullTime(m.ts)}</span>
                  </div>
                </div>
                <div class="starred-card-actions">
                  <button type="button" class="btn ghost xs starred-jump-btn" data-jumpmid="${m.id}" title="Jump to this message in chat">
                    ↗ Jump
                  </button>
                  <button type="button" class="btn ghost xs starred-unstar-btn" data-unstarmid="${m.id}" title="Remove from starred">
                    <span style="color:#f59e0b">${icon('starFill')}</span> Unstar
                  </button>
                </div>
              </div>
              <div class="starred-card-body">
                ${bodyHTML}
              </div>
            </div>`;
        });
      }

      listEl.innerHTML = html;

      // Bind dynamic actions
      $$('[data-dldoc]', listEl).forEach(b => b.onclick = () => downloadAttachment(c, b.dataset.dldoc));
      $$('[data-previewphoto]', listEl).forEach(b => b.onclick = () => openWhatsAppMediaLightbox(b.dataset.previewphoto));

      // Jump to message
      $$('[data-jumpmid]', listEl).forEach(b => b.onclick = () => {
        const mid = b.dataset.jumpmid;
        closeModal();
        setTimeout(() => {
          const el = $(`#m-${mid}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('highlight-pulse');
            setTimeout(() => el.classList.remove('highlight-pulse'), 2500);
          } else {
            toast('Message is not visible in current scroll window');
          }
        }, 120);
      });

      // Unstar
      $$('[data-unstarmid]', listEl).forEach(b => b.onclick = async () => {
        const mid = b.dataset.unstarmid;
        await toggleStarMessage(mid);
        renderStarred();
        updateInfoPaneCounters(c.id);
      });
    }

    // Category Tabs
    $$('#starredCatSeg button', box).forEach(b => {
      b.onclick = () => {
        activeTab = b.dataset.cat;
        $$('#starredCatSeg button', box).forEach(btn => btn.classList.toggle('active', btn.dataset.cat === activeTab));
        renderStarred();
      };
    });

    // Date Range Presets
    $$('#starredPresetsRow button', box).forEach(b => {
      b.onclick = () => {
        datePreset = b.dataset.preset;
        specificDate = '';
        if (dateLabel) dateLabel.textContent = 'Select Date';
        dateBtn?.classList.remove('has-date');
        if (dateClear) dateClear.style.display = 'none';
        $$('#starredPresetsRow button', box).forEach(btn => btn.classList.toggle('active', btn.dataset.preset === datePreset));
        renderStarred();
      };
    });

    if (dateClear) {
      dateClear.onclick = (e) => {
        e.stopPropagation();
        specificDate = '';
        if (dateLabel) dateLabel.textContent = 'Select Date';
        dateBtn?.classList.remove('has-date');
        dateClear.style.display = 'none';
        datePreset = 'all';
        $$('#starredPresetsRow button', box).forEach(btn => btn.classList.toggle('active', btn.dataset.preset === 'all'));
        renderStarred();
      };
    }

    // Keyword Search
    if (searchInp) {
      searchInp.oninput = () => {
        searchQuery = searchInp.value.trim();
        renderStarred();
      };
    }

    // Sort Toggle
    if (sortBtn) {
      sortBtn.onclick = () => {
        sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
        if (sortLabel) sortLabel.textContent = sortOrder === 'desc' ? '↓ Newest' : '↑ Oldest';
        sortBtn.title = sortOrder === 'desc' ? 'Sorting: Newest First' : 'Sorting: Oldest First';
        renderStarred();
      };
    }

    // Initial render
    renderStarred();
  }, 'starred-modal-dialog');
}

// ---------------- Right Info Drawer (Group Admin, Key Rotation, Full Channel Admin Privileges) ----------------
function updateInfoPaneCounters(chatId = S.activeChatId) {
  if (!chatId) return;
  const pane = $('#infoPane');
  if (!pane || pane.classList.contains('hidden')) return;
  if (S.activeChatId !== chatId) return;

  const msgs = S.msgs.get(chatId) || [];
  const mediaCount = msgs.filter(m => !m.deleted && !isViewOnceMsg(m) && (m.kind === 'image' || m.kind === 'video' || m.kind === 'file' || /https?:\/\/[^\s]+/i.test(m._plain?.text || m.body?.text || ''))).length;
  const starredCount = msgs.filter(m => !m.deleted && (m.starredBy || []).includes(S.user?.id)).length;

  const starredPill = $('#infoStarredCountPill', pane);
  if (starredPill) {
    starredPill.textContent = `${starredCount} item${starredCount === 1 ? '' : 's'} ›`;
  }
  const mediaPill = $('#infoMediaCountPill', pane);
  if (mediaPill) {
    mediaPill.textContent = `${mediaCount} item${mediaCount === 1 ? '' : 's'} ›`;
  }
}
window.updateInfoPaneCounters = updateInfoPaneCounters;

function getChannelLinkMeta(platform, url = '', customLabel = '') {
  const map = {
    website: { emoji: '🌐', name: 'Website', color: '#3b82f6' },
    instagram: { emoji: '📸', name: 'Instagram', color: '#ec4899' },
    twitter: { emoji: '𝕏', name: 'X / Twitter', color: '#a1a1aa' },
    youtube: { emoji: '▶️', name: 'YouTube', color: '#ef4444' },
    discord: { emoji: '💬', name: 'Discord', color: '#5865f2' },
    github: { emoji: '💻', name: 'GitHub', color: '#e4e4e7' },
    telegram: { emoji: '✈️', name: 'Telegram', color: '#06b6d4' },
    linkedin: { emoji: '💼', name: 'LinkedIn', color: '#0ea5e9' },
    tiktok: { emoji: '🎵', name: 'TikTok', color: '#f43f5e' },
    link: { emoji: '🔗', name: 'Link', color: '#7c5cff' }
  };
  let plat = String(platform || '').toLowerCase();
  if (!plat || plat === 'auto' || !map[plat]) {
    const low = String(url || '').toLowerCase();
    if (/instagram\.com|instagr\.am/.test(low)) plat = 'instagram';
    else if (/twitter\.com|x\.com/.test(low)) plat = 'twitter';
    else if (/youtube\.com|youtu\.be/.test(low)) plat = 'youtube';
    else if (/discord\.gg|discord\.com/.test(low)) plat = 'discord';
    else if (/github\.com/.test(low)) plat = 'github';
    else if (/t\.me|telegram\.me/.test(low)) plat = 'telegram';
    else if (/linkedin\.com/.test(low)) plat = 'linkedin';
    else if (/tiktok\.com/.test(low)) plat = 'tiktok';
    else plat = 'website';
  }
  const entry = map[plat] || map.link;
  return {
    platform: plat,
    emoji: entry.emoji,
    name: customLabel || entry.name,
    color: entry.color
  };
}

async function renderInfoPane() {
  const c = S.chats.get(S.activeChatId);
  const pane = $('#infoPane');
  if (!c || !pane) return;
  if (pane.dataset.chatId && pane.dataset.chatId !== c.id) {
    pane.innerHTML = '';
  }
  pane.dataset.chatId = c.id;
  if (!pane.innerHTML.trim()) {
    pane.innerHTML = `<div class="row between"><strong>Info & Controls</strong><button class="icon-btn" id="closeInfo">${icon('close')}</button></div><div class="muted xs" style="padding:20px 0;text-align:center">Loading details…</div>`;
    $('#closeInfo', pane)?.addEventListener('click', () => setInfoPaneVisibility(false));
  }
  const d = chatDisplay(c);
  const peer = d.peer;
  if (peer?.id) {
    await ensureUsers([peer.id]).catch(() => {});
    if (S.activeChatId !== c.id) return;
  }
  const isFriend = peer ? isUserFriend(peer.id) : false;
  const isBlocked = peer ? isUserBlocked(peer.id) : false;
  const isMuted = isChatMuted(c.id);
  const isUnaccepted = c.type === 'dm' && peer && c.isAccepted === false && !isFriend && c.ownerId !== S.user.id;
  const amAdmin = c.ownerId === S.user.id || (c.admins || []).includes(S.user.id) || c.isAdmin;

  const msgs = S.msgs.get(c.id) || [];
  const mediaCount = msgs.filter(m => !m.deleted && !isViewOnceMsg(m) && (m.kind === 'image' || m.kind === 'video' || m.kind === 'file' || /https?:\/\/[^\s]+/i.test(m._plain?.text || m.body?.text || ''))).length;
  const starredCount = msgs.filter(m => !m.deleted && (m.starredBy || []).includes(S.user.id)).length;

  let settingsSection = '';
  if (c.type === 'dm' && peer) {
    settingsSection = `
      <div class="info-card">
        <strong>Settings</strong>
        <div class="col gap-xs">
          ${isUnaccepted ? `<button type="button" class="info-action-row" id="infoAcceptChatBtn"><span>✓ Continue with Chat</span></button>` : ''}
          <button type="button" class="info-action-row" id="infoPinChatBtn">
            <span>${c.isPinnedChat ? 'Unpin from Top' : 'Pin to Top'}</span>
            <span class="muted">${c.isPinnedChat ? `<span class="row gap-xs align-center">Pinned ${icon('pinThumbtack')}</span>` : ''}</span>
          </button>
          <button type="button" class="info-action-row" id="infoFriendToggleBtn">
            <span>Friend (Shares Status)</span>
            <span class="muted">${isFriend ? 'Active ✓' : 'Add'}</span>
          </button>
          <button type="button" class="info-action-row" id="infoMuteToggleBtn">
            <span>Notifications</span>
            <span class="muted">${isMuted ? 'Muted' : 'Enabled'}</span>
          </button>
        </div>
      </div>`;
  } else if (c.type === 'group') {
    settingsSection = `
      <div class="info-card">
        <strong>Settings</strong>
        <div class="col gap-xs">
          <button type="button" class="info-action-row" id="infoPinChatBtn">
            <span>${c.isPinnedChat ? 'Unpin from Top' : 'Pin to Top'}</span>
            <span class="muted">${c.isPinnedChat ? `<span class="row gap-xs align-center">Pinned ${icon('pinThumbtack')}</span>` : ''}</span>
          </button>
          <button type="button" class="info-action-row" id="infoMuteToggleBtn">
            <span>Notifications</span>
            <span class="muted">${isMuted ? 'Muted' : 'Enabled'}</span>
          </button>
        </div>
      </div>`;
  } else if (c.type === 'channel') {
    settingsSection = `
      <div class="info-card">
        <strong>Settings</strong>
        <div class="col gap-xs">
          <button type="button" class="info-action-row" id="infoPinChatBtn">
            <span>${c.isPinnedChat ? 'Unpin from Top' : 'Pin to Top'}</span>
            <span class="muted">${c.isPinnedChat ? `<span class="row gap-xs align-center">Pinned ${icon('pinThumbtack')}</span>` : ''}</span>
          </button>
          <button type="button" class="info-action-row" id="infoFollowChannelBtn">
            <span>Following ZovioCast</span>
            <span class="muted">${c.isFollowing ? 'Yes ✓' : 'No'}</span>
          </button>
          <button type="button" class="info-action-row" id="infoMuteToggleBtn">
            <span>Notifications</span>
            <span class="muted">${isMuted ? 'Muted' : 'Enabled'}</span>
          </button>
        </div>
      </div>`;
  } else if (c.type === 'self') {
    settingsSection = `
      <div class="info-card">
        <strong>Saved Messages</strong>
        <div class="col gap-xs">
          <button type="button" class="info-action-row" id="infoPinChatBtn">
            <span>${c.isPinnedChat ? 'Unpin from Top' : 'Pin to Top'}</span>
            <span class="muted">${c.isPinnedChat ? `<span class="row gap-xs align-center">Pinned ${icon('pinThumbtack')}</span>` : ''}</span>
          </button>
          <button type="button" class="info-action-row" id="infoMuteToggleBtn">
            <span>Notifications</span>
            <span class="muted">${isMuted ? 'Muted' : 'Enabled'}</span>
          </button>
        </div>
      </div>`;
  }

  const channelLinks = Array.isArray(c.links) ? c.links : [];

  let editSection = '';
  if ((c.type === 'channel' || c.type === 'group') && amAdmin) {
    const channelLinksAdminBlock = c.type === 'channel' ? `
      <div class="ch-links-admin-block">
        <div class="row between align-center" style="margin-bottom:8px">
          <strong style="font-size:12.5px">Official Channel Links</strong>
          <span class="muted xs">${channelLinks.length}/12</span>
        </div>
        ${channelLinks.length ? `
          <div class="col gap-xs" style="margin-bottom:10px">
            ${channelLinks.map(l => {
              const meta = getChannelLinkMeta(l.platform, l.url, l.label);
              return `<div class="ch-admin-link-row">
                <span class="ch-link-ico">${meta.emoji}</span>
                <div class="ch-admin-link-meta">
                  <div class="ch-link-label">${esc(meta.name)}</div>
                  <div class="ch-link-url">${esc(String(l.url || '').replace(/^https?:\/\//i, ''))}</div>
                </div>
                <button type="button" class="icon-btn sm" data-chlink-del="${esc(l.id)}" title="Remove link">${icon('trash')}</button>
              </div>`;
            }).join('')}
          </div>
        ` : `<div class="muted xs" style="margin-bottom:8px">Add your Website, Instagram, X/Twitter, YouTube, Discord or GitHub.</div>`}
        <div class="col gap-xs">
          <div class="row gap-xs">
            <select id="chLinkPlatform" class="sm" style="width:130px;flex-shrink:0">
              <option value="website">🌐 Website</option>
              <option value="instagram">📸 Instagram</option>
              <option value="twitter">𝕏 X / Twitter</option>
              <option value="youtube">▶️ YouTube</option>
              <option value="discord">💬 Discord</option>
              <option value="github">💻 GitHub</option>
              <option value="telegram">✈️ Telegram</option>
              <option value="linkedin">💼 LinkedIn</option>
              <option value="tiktok">🎵 TikTok</option>
              <option value="link">🔗 Custom</option>
            </select>
            <input id="chLinkLabel" placeholder="Label (optional)" maxlength="40" style="flex:1">
          </div>
          <div class="row gap-xs">
            <input id="chLinkUrl" type="url" placeholder="https://example.com or instagram.com/..." style="flex:1">
            <button type="button" class="btn primary sm" id="addChannelLinkBtn">+ Add</button>
          </div>
        </div>
      </div>` : '';

    editSection = `
      <div class="info-card">
        <strong>${c.type === 'channel' ? 'Channel Admin Settings' : 'Group Admin Settings'}</strong>
        <div class="row gap-s align-center" style="margin:10px 0;padding:8px 12px;background:var(--bg-2);border-radius:12px">
          ${avatarHTML(d.ava, 'md')}
          <div class="col gap-xs" style="flex:1">
            <div style="font-size:12px;font-weight:600;color:var(--text-0)">Custom Logo / Photo</div>
            <div class="row gap-xs wrap" style="margin-top:2px">
              <button type="button" class="btn sm primary" id="changeChatLogoBtn">${icon('camera')} <span>Change Logo</span></button>
              <input type="file" id="chatLogoFileInput" accept="image/*" class="hidden">
              ${c.avatar ? `<button type="button" class="btn sm danger" id="removeChatLogoBtn" style="padding:4px 8px;font-size:11px">Remove</button>` : ''}
            </div>
          </div>
        </div>
        <div class="row gap-xs">
          <input id="editChatEmoji" value="${esc(c.emoji || '🔥')}" style="width:48px;text-align:center" title="Emoji">
          <input id="editChatName" value="${esc(c.name || '')}" placeholder="Title" style="flex:1">
        </div>
        <input id="editChatDesc" value="${esc(c.description || '')}" placeholder="Description" style="margin-top:6px">
        <button class="btn primary sm" id="saveChatInfoBtn" style="margin-top:8px">Save Details</button>
        ${channelLinksAdminBlock}
      </div>`;
  }

  let membersSection = '';
  if (c.type === 'group') {
    membersSection = `
      <div class="info-card">
        <div class="row between"><strong>Members (${c.members.length})</strong>${amAdmin ? `<button class="btn sm" id="addMemBtn">+ Add</button>` : ''}</div>
        ${c.members.map(u => {
          const isAdm = c.ownerId === u.id || (c.admins || []).includes(u.id);
          return `<div class="member-row">
            ${avatarHTML(u, 'sm')}
            <div style="flex:1;min-width:0"><div style="font-weight:700;font-size:13px">${esc(u.name)}</div><small class="muted">@${esc(u.username)} ${u.id === c.ownerId ? '· Owner' : (isAdm ? '· Admin' : '')}</small></div>
            ${isAdm ? `<span class="pill purple xs" style="font-size:10px;margin-right:4px">Admin</span>` : ''}
            ${amAdmin && u.id !== S.user.id && u.id !== c.ownerId ? `
              <button class="btn xs ${isAdm ? 'ghost' : 'primary'}" data-toggleadm="${u.id}" data-adm="${isAdm ? 1 : 0}">${isAdm ? 'Dismiss Admin' : 'Make Admin'}</button>
              <button class="icon-btn" data-kick="${u.id}" title="Remove member">${icon('trash')}</button>
            ` : ''}
          </div>`;
        }).join('')}
      </div>
      ${amAdmin ? `
        <div class="info-card">
          <strong>Posting Permissions</strong>
          <label class="row between" style="cursor:pointer"><span>Only admins can post</span><input type="checkbox" id="onlyAdmToggle" style="width:auto" ${c.settings?.onlyAdmins ? 'checked' : ''}></label>
        </div>
      ` : ''}`;
  } else if (c.type === 'channel' && amAdmin) {
    const followers = await api(`/api/channels/${c.id}/followers`).catch(() => []);
    if (S.activeChatId !== c.id) return;
    membersSection = `
      <div class="info-card">
        <strong>Followers & Admins (${followers.length})</strong>
        <small class="muted">Promoted admins get full channel privileges.</small>
        ${followers.map(u => {
          const isAdm = c.ownerId === u.id || (c.admins || []).includes(u.id);
          return `<div class="member-row">
            ${avatarHTML(u, 'sm')}
            <div style="flex:1;min-width:0"><strong>${esc(u.name)}</strong> <small class="muted">${u.id === c.ownerId ? '· Owner' : (isAdm ? '· Admin' : '· Follower')}</small></div>
            ${u.id !== c.ownerId ? `<button class="btn sm ${isAdm ? 'ghost' : 'primary'}" data-chadm="${u.id}" data-adm="${isAdm ? 1 : 0}">${isAdm ? 'Demote' : 'Make Admin'}</button>` : ''}
          </div>`;
        }).join('')}
      </div>`;
  }

  const bottomActionsSection = `
    <div class="info-card" style="margin-top:auto">
      <div class="col gap-xs">
        <button type="button" class="info-action-row" id="infoClearChatBtn">
          <span class="row gap-xs" style="align-items:center">${icon('refresh')} <span>Clear History</span></span>
        </button>
        ${c.type === 'dm' && peer ? `
          <button type="button" class="info-action-row danger" id="infoBlockToggleBtn">
            <span class="row gap-xs" style="align-items:center">${isBlocked ? icon('shieldCheck') : icon('ban')} <span>${isBlocked ? 'Unblock User' : 'Block User'}</span></span>
          </button>
        ` : ''}
        ${c.type === 'group' && c.ownerId !== S.user.id ? `
          <button type="button" class="info-action-row danger" id="leaveGrpBtn">
            <span class="row gap-xs" style="align-items:center">${icon('logOut')} <span>Leave Group</span></span>
          </button>
        ` : ''}
        <button type="button" class="info-action-row danger" id="infoDeleteChatBtn">
          <span class="row gap-xs" style="align-items:center">${icon('trash')} <span>${c.type === 'channel' ? 'Delete ZovioCast' : (c.type === 'group' ? 'Delete Group' : 'Delete Chat')}</span></span>
        </button>
      </div>
    </div>`;

  const peerObj = (c.type === 'dm' && peer) ? (S.users.get(peer.id) || peer) : null;
  const peerUsername = peerObj ? peerObj.username : (c.type === 'self' ? S.user.username : null);
  const peerPhone = peerObj ? peerObj.phone : (c.type === 'self' ? S.user.phone : null);
  const peerBio = (c.type === 'dm' && peer)
    ? (peerObj?.bio || '')
    : (c.type === 'self' ? (S.user.bio || '') : '');

  const channelLinksSection = (c.type === 'channel' && channelLinks.length) ? `
    <div class="info-card ch-links-card">
      <strong>Links</strong>
      <div class="ch-links-list">
        ${channelLinks.map(l => {
          const meta = getChannelLinkMeta(l.platform, l.url, l.label);
          const cleanHost = String(l.url || '').replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
          return `<a class="ch-link-pill" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer" title="${esc(l.url)}">
            <span class="ch-link-ico">${meta.emoji}</span>
            <span class="ch-link-text">
              <strong>${esc(meta.name)}</strong>
              <small>${esc(cleanHost)}</small>
            </span>
            <span class="ch-link-ext">↗</span>
          </a>`;
        }).join('')}
      </div>
    </div>` : '';

  pane.innerHTML = `
    <div class="row between"><strong>Info & Controls</strong><button class="icon-btn" id="closeInfo">${icon('close')}</button></div>
    <div class="col" style="align-items:center;text-align:center;gap:4px">
      ${avatarHTML(d.ava, 'lg')}
      <h3 style="font-size:18px;font-weight:800;margin-top:6px">${esc(d.title)}</h3>
      ${peerUsername ? `<div class="info-user-handle" style="font-size:13px;font-weight:700;color:var(--brand)">@${esc(peerUsername)}</div>` : ''}
      ${peerPhone ? `<div class="info-user-phone" style="font-size:12.5px;color:var(--text-1);display:inline-flex;align-items:center;gap:6px;background:var(--bg-2);padding:4px 12px;border-radius:99px;border:1px solid var(--border);margin-top:3px">${icon('phone')} <span>${esc(peerPhone)}</span></div>` : ''}
      <span class="muted xs" style="margin-top:3px">${esc(d.sub)}</span>
      ${peerBio ? `<div class="info-user-bio">${esc(peerBio)}</div>` : ''}
      ${c.description ? `<p style="font-size:13px;color:var(--text-1)">${esc(c.description)}</p>` : ''}
    </div>
    ${channelLinksSection}
    <button type="button" class="info-action-row" id="infoSearchChatBtn">
      <div class="row gap-s" style="align-items:center">
        ${icon('search')}
        <strong>Search in Chat</strong>
      </div>
      <span class="muted" style="font-size:12px">Find messages ›</span>
    </button>
    <button type="button" class="info-action-row media-hub-btn" id="infoAllMediaBtn">
      <div class="row gap-s" style="align-items:center">
        ${icon('folder')}
        <strong>All Media, Docs &amp; Links</strong>
      </div>
      <span class="muted" id="infoMediaCountPill" style="font-size:12px">${mediaCount} item${mediaCount === 1 ? '' : 's'} ›</span>
    </button>
    <button type="button" class="info-action-row starred-hub-btn" id="infoStarredContentBtn">
      <div class="row gap-s" style="align-items:center">
        <span style="color:#f59e0b;display:inline-flex;line-height:0">${icon('starFill')}</span>
        <strong>Starred Content</strong>
      </div>
      <span class="muted" id="infoStarredCountPill" style="font-size:12px">${starredCount} item${starredCount === 1 ? '' : 's'} ›</span>
    </button>
    ${settingsSection}
    ${d.e2e ? `<div class="info-card"><div class="row between" style="align-items:center"><div class="row gap-xs" style="align-items:center">${icon('shieldCheck')}<strong>End-to-End Encrypted</strong></div><span class="pill green">Active</span></div></div>` : ''}
    ${editSection}
    ${membersSection}
    ${bottomActionsSection}
  `;

  $('#closeInfo', pane).onclick = () => setInfoPaneVisibility(false);
  if ($('#infoSearchChatBtn', pane)) {
    $('#infoSearchChatBtn', pane).onclick = () => {
      if (window.innerWidth <= 900) setInfoPaneVisibility(false);
      openChatSearch();
    };
  }
  if ($('#infoAllMediaBtn', pane)) $('#infoAllMediaBtn', pane).onclick = () => openSharedMediaModal(c);
  if ($('#infoStarredContentBtn', pane)) $('#infoStarredContentBtn', pane).onclick = () => openStarredContentModal(c);
  if ($('#infoAcceptChatBtn', pane)) $('#infoAcceptChatBtn', pane).onclick = () => acceptChatRequest(c.id);
  if ($('#infoPinChatBtn', pane)) {
    $('#infoPinChatBtn', pane).onclick = async () => {
      await togglePinChat(c.id);
      renderInfoPane();
    };
  }
  if ($('#infoFriendToggleBtn', pane)) $('#infoFriendToggleBtn', pane).onclick = () => peer && toggleMarkFriend(peer.id);
  if ($('#infoMuteToggleBtn', pane)) $('#infoMuteToggleBtn', pane).onclick = () => toggleMuteChat(c.id);
  if ($('#infoClearChatBtn', pane)) $('#infoClearChatBtn', pane).onclick = () => clearChatHistory(c.id);
  if ($('#infoBlockToggleBtn', pane)) $('#infoBlockToggleBtn', pane).onclick = () => peer && toggleBlockUser(peer.id);
  if ($('#infoDeleteChatBtn', pane)) $('#infoDeleteChatBtn', pane).onclick = () => deleteOrLeaveChat(c.id);
  if ($('#infoFollowChannelBtn', pane)) $('#infoFollowChannelBtn', pane).onclick = () => toggleFollowChannel(c);

  if ($('#changeChatLogoBtn', pane)) {
    const fileIn = $('#chatLogoFileInput', pane);
    $('#changeChatLogoBtn', pane).onclick = () => fileIn?.click();
    fileIn.onchange = async () => {
      const file = fileIn.files && fileIn.files[0];
      if (!file) return;
      try {
        toast('Compressing and updating logo…');
        const dataUrl = await fileToDataURL(file, 400, 0.88);
        const res = await api(`/api/chats/${c.id}`, {
          method: 'PATCH',
          body: { avatar: dataUrl }
        });
        const finalChat = res.chat || res;
        c.avatar = dataUrl;
        if (finalChat && finalChat.id) {
          S.chats.set(c.id, { ...c, ...finalChat, avatar: dataUrl });
        }
        toast('Logo updated successfully!', 'ok');
        renderConvoHead();
        renderChatList();
        renderInfoPane();
      } catch (err) {
        toast('Failed to update logo: ' + err.message, 'err');
      }
    };
  }
  if ($('#removeChatLogoBtn', pane)) {
    $('#removeChatLogoBtn', pane).onclick = async () => {
      try {
        const res = await api(`/api/chats/${c.id}`, {
          method: 'PATCH',
          body: { avatar: '' }
        });
        const finalChat = res.chat || res;
        c.avatar = null;
        if (finalChat && finalChat.id) {
          S.chats.set(c.id, { ...c, ...finalChat, avatar: null });
        }
        toast('Logo removed', 'ok');
        renderConvoHead();
        renderChatList();
        renderInfoPane();
      } catch (err) {
        toast('Failed to remove logo: ' + err.message, 'err');
      }
    };
  }

  if ($('#saveChatInfoBtn', pane)) {
    $('#saveChatInfoBtn', pane).onclick = async () => {
      const updated = await api(`/api/chats/${c.id}`, {
        method: 'PATCH',
        body: {
          emoji: $('#editChatEmoji', pane).value.trim(),
          name: $('#editChatName', pane).value.trim(),
          description: $('#editChatDesc', pane).value.trim()
        }
      });
      S.chats.set(updated.id, updated);
      renderConvoHead();
      renderInfoPane();
      toast('Details updated');
    };
  }
  if ($('#addChannelLinkBtn', pane)) {
    const submitLink = async () => {
      const platform = $('#chLinkPlatform', pane)?.value || 'website';
      const label = $('#chLinkLabel', pane)?.value.trim() || '';
      let url = $('#chLinkUrl', pane)?.value.trim() || '';
      if (!url) return toast('Enter a link URL first', 'err');
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url.replace(/^\/+/, '');
      try {
        new URL(url);
      } catch {
        return toast('Please enter a valid URL (e.g. https://instagram.com/zovio)', 'err');
      }
      const nextLinks = [...channelLinks, { platform, label, url }].slice(0, 12);
      const updated = await api(`/api/chats/${c.id}`, {
        method: 'PATCH',
        body: { links: nextLinks }
      });
      S.chats.set(updated.id, updated);
      toast('Channel link added', 'ok');
      renderInfoPane();
    };
    $('#addChannelLinkBtn', pane).onclick = submitLink;
    $('#chLinkUrl', pane)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitLink();
      }
    });
  }
  $$('[data-chlink-del]', pane).forEach(btn => {
    btn.onclick = async () => {
      const linkId = btn.dataset.chlinkDel;
      const nextLinks = channelLinks.filter(l => l.id !== linkId);
      const updated = await api(`/api/chats/${c.id}`, {
        method: 'PATCH',
        body: { links: nextLinks }
      });
      S.chats.set(updated.id, updated);
      toast('Link removed');
      renderInfoPane();
    };
  });
  if ($('#onlyAdmToggle', pane)) {
    $('#onlyAdmToggle', pane).onchange = e => api(`/api/chats/${c.id}`, { method: 'PATCH', body: { settings: { onlyAdmins: e.target.checked } } });
  }
  if ($('#addMemBtn', pane)) {
    $('#addMemBtn', pane).onclick = () => openAddMemberModal(c);
  }
  $$('[data-toggleadm]', pane).forEach(b => b.onclick = async () => {
    const updated = await api(`/api/chats/${c.id}/admins`, { method: 'POST', body: { userId: b.dataset.toggleadm, admin: b.dataset.adm !== '1' } });
    if (updated && updated.id) {
      S.chats.set(updated.id, updated);
      toast(b.dataset.adm !== '1' ? 'Promoted to group admin' : 'Admin status dismissed');
      renderInfoPane();
      renderChatList();
    }
  });
  $$('[data-chadm]', pane).forEach(b => b.onclick = async () => {
    const updated = await api(`/api/chats/${c.id}/admins`, { method: 'POST', body: { userId: b.dataset.chadm, admin: b.dataset.adm !== '1' } });
    if (updated && updated.id) {
      S.chats.set(updated.id, updated);
      toast(b.dataset.adm !== '1' ? 'Promoted to channel admin' : 'Channel admin demoted');
      renderInfoPane();
      renderChatList();
    }
  });
  $$('[data-kick]', pane).forEach(b => b.onclick = () => removeGroupMember(c, b.dataset.kick));
  if ($('#leaveGrpBtn', pane)) $('#leaveGrpBtn', pane).onclick = () => removeGroupMember(c, S.user.id);
  if ($('#delChatBtn', pane)) $('#delChatBtn', pane).onclick = () => deleteOrLeaveChat(c.id);
}

async function openAddMemberModal(c) {
  const allUsers = await api('/api/users');
  allUsers.forEach(u => S.users.set(u.id, u));

  // Determine contacts & friends: only users the current user has contacted or added as friend
  const contactUserIds = new Set();
  (S.user?.friends || []).forEach(fid => contactUserIds.add(fid));
  for (const ch of S.chats.values()) {
    if (ch.type === 'dm' && Array.isArray(ch.members)) {
      ch.members.forEach(mid => {
        if (mid && mid !== S.user.id) contactUserIds.add(mid);
      });
    }
  }

  const existingMemberIds = new Set((c.members || []).map(m => (typeof m === 'string' ? m : m.id)));
  const selectedAddIds = new Set();

  showModal('Add Members to Group', `
    <div class="col gap-s">
      <input id="addMemSearch" placeholder="Search by @username to add new users…" style="font-size:13px;padding:8px 12px">
      <div class="row between items-center">
        <span class="muted" style="font-size:11.5px" id="addMemLabel">Contacts & Friends:</span>
        <span id="addMemCount" style="font-size:11.5px;color:var(--brand);font-weight:600">0 selected</span>
      </div>
      <div id="addMemList" class="col gap-xs" style="max-height:240px;overflow-y:auto;padding-right:2px"></div>
      <button class="btn primary lg" id="confirmAddMem">Add Selected Members</button>
    </div>
  `, box => {
    const renderAddCandidates = (filterQuery = '') => {
      const q = filterQuery.trim().toLowerCase().replace(/^@/, '');
      const listEl = $('#addMemList', box);
      const labelEl = $('#addMemLabel', box);
      if (!listEl) return;

      let visible = [];
      if (q) {
        if (labelEl) labelEl.textContent = `Search results for "${filterQuery.trim()}":`;
        visible = allUsers.filter(u => {
          if (existingMemberIds.has(u.id) || u.id === S.user.id) return false;
          const uname = (u.username || '').toLowerCase();
          const unameClean = uname.replace(/^@/, '');
          const name = (u.name || '').toLowerCase();
          return uname.includes(q) || unameClean.includes(q) || name.includes(q) || selectedAddIds.has(u.id);
        });
      } else {
        if (labelEl) labelEl.textContent = 'Contacts & Friends:';
        visible = allUsers.filter(u => {
          if (existingMemberIds.has(u.id) || u.id === S.user.id) return false;
          return contactUserIds.has(u.id) || selectedAddIds.has(u.id);
        });
      }

      if (!visible.length) {
        if (q) {
          listEl.innerHTML = `<div class="muted" style="font-size:12px;padding:14px;text-align:center;background:var(--bg-2);border-radius:10px">No users found matching "${esc(filterQuery.trim())}". Check exact @username.</div>`;
        } else {
          listEl.innerHTML = `<div class="muted" style="font-size:12px;padding:14px;text-align:center;background:var(--bg-2);border-radius:10px">No remaining contacts to add.<br><span style="font-size:11px;opacity:0.8">Type an exact @username above to search.</span></div>`;
        }
        return;
      }

      listEl.innerHTML = visible.map(u => {
        const isChecked = selectedAddIds.has(u.id);
        const isContact = contactUserIds.has(u.id);
        return `
          <label class="row gap-s items-center" style="padding:8px 10px;background:var(--bg-2);border-radius:10px;cursor:pointer;border:1px solid ${isChecked ? 'var(--brand)' : 'transparent'}">
            <input type="checkbox" data-add-uid="${u.id}" ${isChecked ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--brand);flex-shrink:0">
            ${avatarHTML(u, 'sm')}
            <div style="flex:1;min-width:0;overflow:hidden">
              <div class="row items-center gap-xs">
                <strong style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(u.name)}</strong>
                ${isContact ? '<span class="chip-sm" style="font-size:10px;padding:1px 5px;background:rgba(124,92,255,0.18);color:var(--brand);border-radius:4px">Contact</span>' : ''}
              </div>
              <small class="muted" style="font-size:11.5px">@${esc(u.username)}</small>
            </div>
          </label>
        `;
      }).join('');

      $$('input[data-add-uid]', listEl).forEach(cb => {
        cb.onchange = e => {
          const uid = cb.dataset.addUid;
          if (e.target.checked) selectedAddIds.add(uid);
          else selectedAddIds.delete(uid);
          const cnt = $('#addMemCount', box);
          if (cnt) cnt.textContent = `${selectedAddIds.size} selected`;
          const parentLabel = cb.closest('label');
          if (parentLabel) parentLabel.style.borderColor = e.target.checked ? 'var(--brand)' : 'transparent';
        };
      });
    };

    renderAddCandidates('');

    $('#addMemSearch', box).oninput = e => {
      renderAddCandidates(e.target.value);
    };

    $('#confirmAddMem', box).onclick = async () => {
      const ids = Array.from(selectedAddIds);
      if (!ids.length) return toast('Select at least one member', 'err');
      const myBox = c.keys[c.keyVersion];
      await ensureUsers([myBox.wrapperId]);
      const wrapper = myBox.wrapperId === S.user.id ? S.user : S.users.get(myBox.wrapperId);
      const rawKey = await E2E.unwrapKey(myBox, S.privateKey, wrapper.publicKey);
      const keys = {};
      for (const id of ids) {
        const u = S.users.get(id);
        keys[id] = { wrapperId: S.user.id, ...(await E2E.wrapKey(rawKey, S.privateKey, u.publicKey)) };
      }
      await api(`/api/chats/${c.id}/members`, { method: 'POST', body: { userIds: ids, keys } });
      closeModal();
    };
  });
}

async function removeGroupMember(c, targetId) {
  const remaining = c.members.filter(m => m.id !== targetId);
  let rotate = null;
  if (remaining.length) {
    const { keys } = await wrapNewChatKey(remaining);
    rotate = { version: c.keyVersion + 1, keys };
  }
  await api(`/api/chats/${c.id}/remove`, { method: 'POST', body: { userId: targetId, rotate } });
  toast(targetId === S.user.id ? 'Left group' : 'Member removed & group key rotated');
}

// ---------------- Modern Draggable Pane Resizers / Sliders ----------------
function initPaneResizers() {
  const root = document.documentElement;
  const leftResizer = $('#resizerLeft');
  const rightResizer = $('#resizerRight');
  const listPane = $('.list-pane');
  const infoPane = $('#infoPane');

  // Load saved widths
  const savedLeft = localStorage.getItem('fireupp_chats_width');
  if (savedLeft && !isNaN(parseInt(savedLeft, 10))) {
    root.style.setProperty('--chats-list-width', `${parseInt(savedLeft, 10)}px`);
  }
  const savedRight = localStorage.getItem('fireupp_info_width');
  if (savedRight && !isNaN(parseInt(savedRight, 10))) {
    root.style.setProperty('--info-pane-width', `${parseInt(savedRight, 10)}px`);
  }

  // Double-click to reset
  if (leftResizer) {
    leftResizer.ondblclick = () => {
      root.style.removeProperty('--chats-list-width');
      localStorage.removeItem('fireupp_chats_width');
      SoundFX?.play?.('click');
    };
  }
  if (rightResizer) {
    rightResizer.ondblclick = () => {
      root.style.removeProperty('--info-pane-width');
      localStorage.removeItem('fireupp_info_width');
      SoundFX?.play?.('click');
    };
  }

  // Drag Left Resizer (Controls list-pane width)
  if (leftResizer && listPane) {
    let startX = 0;
    let startW = 0;

    const onPointerMove = (e) => {
      const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
      if (clientX === undefined) return;
      const delta = clientX - startX;
      const minW = 240;
      const maxW = Math.min(540, Math.floor(window.innerWidth * 0.45));
      const newW = Math.max(minW, Math.min(maxW, Math.round(startW + delta)));
      root.style.setProperty('--chats-list-width', `${newW}px`);
    };

    const onPointerUp = () => {
      leftResizer.classList.remove('is-dragging');
      document.body.classList.remove('is-resizing-pane');
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      const curW = parseInt(getComputedStyle(root).getPropertyValue('--chats-list-width'), 10) || listPane.offsetWidth;
      localStorage.setItem('fireupp_chats_width', curW);
    };

    const onPointerDown = (e) => {
      if (e.button && e.button !== 0) return;
      startX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
      startW = listPane.offsetWidth;
      leftResizer.classList.add('is-dragging');
      document.body.classList.add('is-resizing-pane');
      window.addEventListener('mousemove', onPointerMove);
      window.addEventListener('mouseup', onPointerUp);
      window.addEventListener('touchmove', onPointerMove, { passive: true });
      window.addEventListener('touchend', onPointerUp);
      e.preventDefault();
    };

    leftResizer.addEventListener('mousedown', onPointerDown);
    leftResizer.addEventListener('touchstart', onPointerDown, { passive: false });
  }

  // Drag Right Resizer (Controls infoPane width)
  if (rightResizer && infoPane) {
    let startX = 0;
    let startW = 0;

    const onPointerMove = (e) => {
      const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
      if (clientX === undefined) return;
      // Moving mouse left increases info pane width, moving right shrinks it
      const delta = startX - clientX;
      const minW = 260;
      const maxW = Math.min(560, Math.floor(window.innerWidth * 0.45));
      const newW = Math.max(minW, Math.min(maxW, Math.round(startW + delta)));
      root.style.setProperty('--info-pane-width', `${newW}px`);
    };

    const onPointerUp = () => {
      rightResizer.classList.remove('is-dragging');
      document.body.classList.remove('is-resizing-pane');
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      const curW = parseInt(getComputedStyle(root).getPropertyValue('--info-pane-width'), 10) || infoPane.offsetWidth;
      localStorage.setItem('fireupp_info_width', curW);
    };

    const onPointerDown = (e) => {
      if (e.button && e.button !== 0) return;
      startX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
      startW = infoPane.offsetWidth;
      rightResizer.classList.add('is-dragging');
      document.body.classList.add('is-resizing-pane');
      window.addEventListener('mousemove', onPointerMove);
      window.addEventListener('mouseup', onPointerUp);
      window.addEventListener('touchmove', onPointerMove, { passive: true });
      window.addEventListener('touchend', onPointerUp);
      e.preventDefault();
    };

    rightResizer.addEventListener('mousedown', onPointerDown);
    rightResizer.addEventListener('touchstart', onPointerDown, { passive: false });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPaneResizers);
} else {
  initPaneResizers();
}

window.addEventListener('focus', () => {
  if (S.activeChatId && S.user?.preferences?.readReceipts !== false &&
      (typeof isAppPresenceActive !== 'function' || isAppPresenceActive())) {
    const c = S.chats.get(S.activeChatId);
    if (c) {
      c.unread = 0;
      if (typeof renderChatList === 'function') renderChatList();
      api(`/api/chats/${c.id}/read`, { method: 'POST' }).catch(() => {});
    }
  }
});
