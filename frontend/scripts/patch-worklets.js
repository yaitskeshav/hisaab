const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-worklets',
  'android',
  'src',
  'main',
  'java',
  'com',
  'swmansion',
  'worklets',
  'WorkletsMessageQueueThreadBase.java'
);

// Original code to replace
const oldCode = `  public void quitSynchronous() {
    try {
      Field mIsFinished = messageQueueThread.getClass().getDeclaredField("mIsFinished");
      mIsFinished.setAccessible(true);
      mIsFinished.set(messageQueueThread, true);
      mIsFinished.setAccessible(false);
    } catch (NoSuchFieldException | IllegalAccessException e) {
      e.printStackTrace();
    }
  }`;

// New code that tries both field names (Kotlin's isFinished and Java's mIsFinished)
const newCode = `  public void quitSynchronous() {
    try {
      // Try Kotlin field name first (RN 0.81+), then fall back to Java field name
      Field isFinishedField = null;
      try {
        isFinishedField = messageQueueThread.getClass().getDeclaredField("isFinished");
      } catch (NoSuchFieldException e) {
        // Try old Java naming convention (mIsFinished)
        isFinishedField = messageQueueThread.getClass().getDeclaredField("mIsFinished");
      }
      isFinishedField.setAccessible(true);
      isFinishedField.set(messageQueueThread, true);
      isFinishedField.setAccessible(false);
    } catch (NoSuchFieldException | IllegalAccessException e) {
      e.printStackTrace();
    }
  }`;

try {
  if (!fs.existsSync(filePath)) {
    console.log('react-native-worklets not found, skipping patch');
    process.exit(0);
  }

  let content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('isFinishedField')) {
    console.log('react-native-worklets already patched');
    process.exit(0);
  }

  if (!content.includes(oldCode)) {
    console.log('react-native-worklets: could not find code to patch (may have been updated)');
    process.exit(0);
  }

  content = content.replace(oldCode, newCode);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('react-native-worklets patched successfully for RN 0.81+ compatibility');
} catch (err) {
  console.error('Failed to patch react-native-worklets:', err.message);
  process.exit(1);
}
