/* eslint-env node */

module.exports = {
  root: true,
  extends: [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    '@vue/eslint-config-typescript',
    // 'plugin:vue/vue3-recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest'
  },
  rules: {
    'vue/max-attributes-per-line': ['off', {
      singleline: { max: 5 },
      multiline: { max: 5 },
    }],
    'vue/multi-word-component-names': 'off',
    'vue/attributes-order': 'off',
    'vue/first-attribute-linebreak': 'off',
    'vue/require-toggle-inside-transition': 'off',
  },
  // overrides: [
  //   {
  //     files: [ '*.ts', '*.vue' ],
  //     rules: {
  //       'no-undef': 'off'
  //     }
  //   }
  // ]
}
