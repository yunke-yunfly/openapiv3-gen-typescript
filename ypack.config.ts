import { defineLibConfig } from '@yunke/ypack';

export default defineLibConfig({
  entry: 'src/{!(*.d).ts,!(__tests__)/*.ts}',
  output: {
    cjs: {
      dir: './dist',
    },
  },
});
