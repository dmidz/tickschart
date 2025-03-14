## [1.4.2](https://github.com/dmidz/tickschart/compare/v1.4.1...v1.4.2) (2025-03-11)


### Bug Fixes

* **core:** Fetcher getTick remove default tick arg ([15ab2fa](https://github.com/dmidz/tickschart/commit/15ab2fa6937aa68dc0338de4a8ed398711febfab))



## [1.4.1](https://github.com/dmidz/tickschart/compare/v1.4.0...v1.4.1) (2025-03-10)


### Bug Fixes

* **core:** [TC-28] loading & display fixes ([#21](https://github.com/dmidz/tickschart/issues/21)) ([fb7fbf4](https://github.com/dmidz/tickschart/commit/fb7fbf4383b7684c57f2030ae670ae5d111f7f1e))



# [1.4.0](https://github.com/dmidz/tickschart/compare/v1.3.2...v1.4.0) (2025-02-14)


### Bug Fixes

* **core:** update deps ([335cbab](https://github.com/dmidz/tickschart/commit/335cbab832f878d6f5a8651091d02930b3ee9b77))


### Features

* **indicator:** update ma1 in group settings so it can be set not active ([8652985](https://github.com/dmidz/tickschart/commit/86529856e100de8f47ef00f705b6c8b799f58aef))



## [1.3.2](https://github.com/dmidz/tickschart/compare/v1.3.1...v1.3.2) (2025-02-13)


### Bug Fixes

* **indicator:** restore modified/added indicators after reload ([#20](https://github.com/dmidz/tickschart/issues/20)) ([cc93442](https://github.com/dmidz/tickschart/commit/cc9344201d11f06193de37868abea85f4cb60c98))
* **indicator:** set esbuild keepNames false as class names are used as LS keys ( 5.6% bundle size increase ) ([7452f60](https://github.com/dmidz/tickschart/commit/7452f60de16ae5ce151fb55ffbd5137f7300b2e8))



## [1.3.1](https://github.com/dmidz/tickschart/compare/v1.3.0...v1.3.1) (2024-12-16)


### Bug Fixes

* **core:** fix fake realtime tick ([52d5b48](https://github.com/dmidz/tickschart/commit/52d5b48379635dd3868de1150cdea8f0c98f2815))
* **core:** setTickStep settickStepDelta to 0 by default ([1f5482a](https://github.com/dmidz/tickschart/commit/1f5482aecbe65f928a50a65fa14286dbb6417c30))


### Features

* **core:** move settings save to IndicatorSettings ([8add48a](https://github.com/dmidz/tickschart/commit/8add48af76cc3f743f5769885abd746bfa711cb9))



# [1.3.0](https://github.com/dmidz/tickschart/compare/v1.2.1...v1.3.0) (2024-11-27)


### Bug Fixes

* **core:** Chart add tickStepDelta ([7f21afc](https://github.com/dmidz/tickschart/commit/7f21afc16e7924f6362f22cbb41be02ae7917b2f))
* **core:** no draw when tick = defaultTick ([363b598](https://github.com/dmidz/tickschart/commit/363b598d2a82c336f547688cb801dbd216c85a16))


### Features

* **core:** add chart.drawTickClear to repaint a specific tick ( such last real time one ) ([767163a](https://github.com/dmidz/tickschart/commit/767163a21da5166663d4508c9a011083b6000c21))



## [1.2.1](https://github.com/dmidz/tickschart/compare/v1.2.0...v1.2.1) (2024-11-16)


### Bug Fixes

* **core:** indicators' label & demo css ([0f29d1b](https://github.com/dmidz/tickschart/commit/0f29d1bdd4249b6ca5ad79cc3418c8419c2951fd))



# [1.2.0](https://github.com/dmidz/tickschart/compare/v1.1.0...v1.2.0) (2024-11-16)


### Features

* **core:** indicators add / remove ([#19](https://github.com/dmidz/tickschart/issues/19)) ([861503c](https://github.com/dmidz/tickschart/commit/861503c6ca54f794c594265d958a6e70bb10ebee))



# [1.1.0](https://github.com/dmidz/tickschart/compare/v1.0.1...v1.1.0) (2024-10-30)


### Features

* **dx:** API sample ([#18](https://github.com/dmidz/tickschart/issues/18)) ([2baf488](https://github.com/dmidz/tickschart/commit/2baf48891443a420d5555cfddc8e664ba05832aa))



## [1.0.1](https://github.com/dmidz/tickschart/compare/v1.0.0...v1.0.1) (2024-10-28)


### Bug Fixes

* **core:** package.json add css export entry ([7889c59](https://github.com/dmidz/tickschart/commit/7889c5932cf6c78a5a6f3d0fde2cc6502bb9cbff))
* **core:** update select style ([1393820](https://github.com/dmidz/tickschart/commit/139382029ca4ace1826b255cdde86e449c9d57ea))



# [1.0.0](https://github.com/dmidz/tickschart/compare/v0.0.24...v1.0.0) (2024-10-28)


### Bug Fixes

* **core:** update packages ([4fa7ced](https://github.com/dmidz/tickschart/commit/4fa7ced2de2952ce1163cf12e1360de1c9518003))



## [0.0.24](https://github.com/dmidz/tickschart/compare/v0.0.23...v0.0.24) (2024-10-28)


### Bug Fixes

* **core:** Fetcher getTick binding ([4239ebf](https://github.com/dmidz/tickschart/commit/4239ebfa9a37b1186caeb5df6dc2bfae8fb51314))



## [0.0.23](https://github.com/dmidz/tickschart/compare/v0.0.22...v0.0.23) (2024-10-08)


### Features

* **core:** add "main" entry in package.json to setup jsdelivr default file ([0d75096](https://github.com/dmidz/tickschart/commit/0d75096f4b0f8f104ac4108e61d9125d2011dd85))



## [0.0.22](https://github.com/dmidz/tickschart/compare/v0.0.21...v0.0.22) (2024-10-07)


### Features

* **core:** css style integrated in published lib ([#17](https://github.com/dmidz/tickschart/issues/17)) ([2b73ab9](https://github.com/dmidz/tickschart/commit/2b73ab9d5f0f5646a718f233af6e425283de5bad))



## [0.0.21](https://github.com/dmidz/tickschart/compare/v0.0.20...v0.0.21) (2024-06-16)


### Bug Fixes

* **player:** [TC-26] few bugs + speed select ([#15](https://github.com/dmidz/tickschart/issues/15)) ([fb626f1](https://github.com/dmidz/tickschart/commit/fb626f1a9fb8d59a1638165011bb3f463a50866f))


### Features

* **core:** [TC-12] lib assets integration ([#16](https://github.com/dmidz/tickschart/issues/16)) ([af3ecf8](https://github.com/dmidz/tickschart/commit/af3ecf880b2eea9772f9cf407cacf2a716ddbb90))



## [0.0.20](https://github.com/dmidz/tickschart/compare/v0.0.19...v0.0.20) (2024-03-28)


### Features

* **player:** [TC-3] Player class ( ticks replay ) ([#14](https://github.com/dmidz/tickschart/issues/14)) ([2165ee5](https://github.com/dmidz/tickschart/commit/2165ee5879bef71d9ecfe6669bfc3ad0c435db2c))



## [0.0.19](https://github.com/dmidz/tickschart/compare/v0.0.18...v0.0.19) (2024-03-21)


### Bug Fixes

* **dx:** prefix assets tickschart/ ([a4bfcfc](https://github.com/dmidz/tickschart/commit/a4bfcfcce3a18b61b94b6dd07330484114c04e64))



## [0.0.18](https://github.com/dmidz/tickschart/compare/v0.0.17...v0.0.18) (2024-03-21)


### Features

* **indicator:** [TC-9] label settings ([#13](https://github.com/dmidz/tickschart/issues/13)) ([cfb4ee2](https://github.com/dmidz/tickschart/commit/cfb4ee28f71dec3fd358e9d98865974f13bf3691))



## [0.0.17](https://github.com/dmidz/tickschart/compare/v0.0.16...v0.0.17) (2024-03-15)


### Features

* **indicator:** [TC-19] new indicator OBV ([#12](https://github.com/dmidz/tickschart/issues/12)) ([f7e2598](https://github.com/dmidz/tickschart/commit/f7e2598794341849713fab24e27df2e40e2aae8e))



## [0.0.16](https://github.com/dmidz/tickschart/compare/v0.0.15...v0.0.16) (2024-02-20)


### Features

* **dx:** github workflow to publish demo as github pages ([5054c92](https://github.com/dmidz/tickschart/commit/5054c9241dc2f0a96cc604f9a45d5697e1ed095b))



## [0.0.15](https://github.com/dmidz/tickschart/compare/v0.0.14...v0.0.15) (2024-02-19)


### Features

* **core:** [TC-11] tick customization ([#11](https://github.com/dmidz/tickschart/issues/11)) ([61b38f1](https://github.com/dmidz/tickschart/commit/61b38f1c2e37f368b9824486eb810a5d2384927b))



## [0.0.14](https://github.com/dmidz/tickschart/compare/v0.0.13...v0.0.14) (2024-02-15)


### Bug Fixes

* **demo:** remove vue usage from vanilla-js & vanilla-ts ([d0af24d](https://github.com/dmidz/tickschart/commit/d0af24dbf06defd7def86ea05287bcc16ed12ed3))



## [0.0.13](https://github.com/dmidz/tickschart/compare/v0.0.12...v0.0.13) (2024-02-15)


### Bug Fixes

* **dx:** move vue dep in devDependencies ([3967fc9](https://github.com/dmidz/tickschart/commit/3967fc98ef33e5ec5a5dbe15e9ec5caa3ed6b2be))



## [0.0.12](https://github.com/dmidz/tickschart/compare/v0.0.11...v0.0.12) (2024-02-15)


### Features

* **indicator:** [TC-15] new complex indicator VolumeImpulse ([#9](https://github.com/dmidz/tickschart/issues/9)) ([1f0f52d](https://github.com/dmidz/tickschart/commit/1f0f52dbe2f5c5aad94d62116a7cedf3cdff08df))



## [0.0.11](https://github.com/dmidz/tickschart/compare/v0.0.9...v0.0.11) (2024-02-12)


### Bug Fixes

* **core:** Fetcher: fix mightRefresh ([3e29194](https://github.com/dmidz/tickschart/commit/3e2919474957be6fdb3274c3a13d2e523f71a371))



## [0.0.9](https://github.com/dmidz/tickschart/compare/v0.0.8...v0.0.9) (2024-02-09)



## [0.0.8](https://github.com/dmidz/tickschart/compare/v0.0.7...v0.0.8) (2024-02-08)


### Features

* **core:** [TC-6] on chart indicators ( layers ) ([#8](https://github.com/dmidz/tickschart/issues/8)) ([bcff59a](https://github.com/dmidz/tickschart/commit/bcff59aef90d8949d4f524870dfa350a32e5d6ba))



## [0.0.7](https://github.com/dmidz/tickschart/compare/v0.0.6...v0.0.7) (2024-02-07)



## [0.0.6](https://github.com/dmidz/tickschart/compare/v0.0.5...v0.0.6) (2024-02-07)


### Features

* **computation:** [TC-5] indicator ema + optim sma ([#6](https://github.com/dmidz/tickschart/issues/6)) ([2d5ee68](https://github.com/dmidz/tickschart/commit/2d5ee68fab381ed93a49f84528664760128e2c66))
* **dx:** script release: add prompt for otp code ([#7](https://github.com/dmidz/tickschart/issues/7)) ([820ce71](https://github.com/dmidz/tickschart/commit/820ce71a6ec516c2bcbdcac5645183ec668f9155))



## [0.0.5](https://github.com/dmidz/tickschart/compare/v0.0.4...v0.0.5) (2024-02-06)


### Bug Fixes

* **core:** [TC-2] UI small fixes ([#5](https://github.com/dmidz/tickschart/issues/5)) ([befc29c](https://github.com/dmidz/tickschart/commit/befc29c4d09cbfe5e66db7330a41739e6956200c))
* **core:** Release script sync dev even dry so Changelog updated ([aeafb11](https://github.com/dmidz/tickschart/commit/aeafb11ec2934d4d9c46e5423912a2ae635d3415))


### Features

* **dx:** release script: add dry value on step publishing ([400ab4f](https://github.com/dmidz/tickschart/commit/400ab4f3d07e4150ee93669db58bd0d801a726f8))
* **dx:** release script: add prompt check changelog ([a353632](https://github.com/dmidz/tickschart/commit/a3536328955b87a67859e63a3b5a4d01ff3880a7))




