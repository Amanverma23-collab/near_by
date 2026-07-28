const { spawnSync } = require('child_process');
const path = require('path');

const env = {
  ...process.env,
  JAVA_HOME: 'C:\\Program Files\\Android\\Android Studio4\\jbr',
  ANDROID_HOME: 'C:\\Users\\DELL\\AppData\\Local\\Android\\Sdk',
  ANDROID_SDK_ROOT: 'C:\\Users\\DELL\\AppData\\Local\\Android\\Sdk',
  PATH: `C:\\Program Files\\Android\\Android Studio4\\jbr\\bin;${process.env.PATH || ''}`
};

const javaExe = `C:\\Program Files\\Android\\Android Studio4\\jbr\\bin\\java.exe`;
const jarPath = path.join(__dirname, '..', 'android', 'gradle', 'wrapper', 'gradle-wrapper.jar');
const androidDir = path.join(__dirname, '..', 'android');

console.log('🚀 Testing Android Studio4 JDK...');

const res = spawnSync(javaExe, ['-jar', jarPath, 'assembleDebug'], {
  cwd: androidDir,
  env,
  stdio: 'inherit'
});

if (res.status === 0) {
  console.log('\n✅ APK Compilation Successful!');
} else {
  console.error('\n❌ Build Failed with code:', res.status);
  process.exit(res.status || 1);
}
