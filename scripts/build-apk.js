const { execSync } = require('child_process');
const path = require('path');

const env = {
  ...process.env,
  JAVA_HOME: 'C:\\Program Files\\Android\\Android Studio\\jbr',
  PATH: `C:\\Program Files\\Android\\Android Studio\\jbr\\bin;${process.env.PATH || ''}`
};

console.log('🚀 Starting standalone APK compilation with Android Studio JDK...');

try {
  execSync('gradlew.bat assembleDebug', {
    cwd: path.join(__dirname, '..', 'android'),
    env,
    stdio: 'inherit'
  });
  console.log('✅ APK Compilation Successful!');
} catch (err) {
  console.error('❌ Build Error:', err.message);
  process.exit(1);
}
