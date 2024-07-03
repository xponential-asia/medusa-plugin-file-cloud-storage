# Google Cloud Storage

Store uploaded files to your Medusa backend on Google Cloud Storage.

[![codecov](https://codecov.io/gh/xponential-asia/medusa-plugin-file-cloud-storage/graph/badge.svg?token=TL39AFEH05)](https://codecov.io/gh/xponential-asia/medusa-plugin-file-cloud-storage)
[![Renovate enabled](https://img.shields.io/badge/renovate-enabled-brightgreen.svg)](https://renovatebot.com/)
[![Build](https://github.com/xponential-asia/medusa-plugin-file-cloud-storage/actions/workflows/release.yml/badge.svg?branch=main)](https://github.com/xponential-asia/medusa-plugin-file-cloud-storage/actions/workflows/release.yml)

## Features

- Store product images on Google Cloud Storage.
- Support for both private and public buckets.
- Download/Delete product images on Google Cloud Storage.
- Get URL product images on Google Cloud Storage.

---

## Prerequisites

- [Medusa backend](https://docs.medusajs.com/development/backend/install)
- [Google Cloud Storage](https://cloud.google.com/products/storage/?utm_source=google&utm_medium=cpc&utm_campaign=japac-TH-all-en-dr-BKWS-all-all-trial-PHR-dr-1605216&utm_content=text-ad-none-none-DEV_c-CRE_667077632139-ADGP_Hybrid+%7C+BKWS+-+BRO+%7C+Txt+~+Storage_Cloud+Storage_cloud_main-KWID_43700077632315347-kwd-11012518454&userloc_9074780-network_g&utm_term=KW_google+cloud+storage&gclid=Cj0KCQiAuqKqBhDxARIsAFZELmKbHguAQGtreM23BfmHUZPKuy40DTwH0pG-BERgYZuqea4E0VxmwDAaAivWEALw_wcB&gclsrc=aw.ds&hl=en)

---

## How to Install Plugin

1\. Run the following command in the directory of the Medusa backend:

  ```bash
  npm install medusa-plugin-file-cloud-storage
  ```

2\. Set the following environment backend medusa variables in `.env`. If you are deploying to a GCP product that supports Application Default credentials, you can leave `CLIENT_EMAIL` and `PRIVATE_KEY` this omitted, and authentication will work automatically.:

  ```bash
  CLIENT_EMAIL=<CLIENT_EMAIL>
  PRIVATE_KEY=<PRIVATE_KEY>
  BUCKET_NAME=<PRIVATE_KEY>
  ```

3\. In `medusa-config.js` add the following at the end of the `plugins` array:

  ```js
  const plugins = [
    // ...
    {
      resolve: `medusa-plugin-file-cloud-storage`,
      options: {
          credentials : {
            client_email: process.env.CLIENT_EMAIL,
            private_key: process.env.PRIVATE_KEY
          },
          privateBucketName: process.env.GCP_STORAGE_PRIVATE_BUCKET_NAME,
          publicBucketName: process.env.GCP_STORAGE_PUBLIC_BUCKET_NAME,
          basePublicUrl: process.env.GCP_STORAGE_BASE_PUBLIC_URL,
      },
    },
  ]
  ```

---

## Test the Plugin

1\. Run the following command in the directory of the Medusa backend to run the backend:

  ```bash
  npm run start
  ```

2\. Upload an image for a product using the admin dashboard or using [the Admin APIs](https://docs.medusajs.com/api/admin#tag/Upload).

---