# This dockerfile builds both stage1 and stage2 in one go

FROM node:20 AS builder_stage1

RUN npm install -g pnpm

SHELL ["/bin/bash", "-c"]

ADD . /picsur
WORKDIR /picsur

RUN pnpm install --frozen-lockfile

RUN pnpm --filter picsur-shared build
RUN pnpm --filter picsur-frontend build
RUN pnpm --filter picsur-backend build

# === START VIPS ===
FROM node:20-alpine AS vips_builder
RUN apk add build-base meson cmake pkgconfig glib-dev \
    expat-dev libexif-dev jpeg-dev libjxl-dev openjpeg-dev libpng-dev \
    tiff-dev libheif-dev libwebp-dev cgif-dev imagemagick-dev \
    librsvg-dev pango-dev cfitsio-dev poppler-dev libspng-dev \
    lcms2-dev fftw-dev libimagequant-dev
WORKDIR /vips
RUN wget https://github.com/libvips/libvips/releases/download/v8.16.0/vips-8.16.0.tar.xz -O vips.tar.xz
RUN tar -xf vips.tar.xz && \
    cd vips-* && \
    meson setup build -Dexamples=false && \
    cd build && \
    meson compile && \
    meson install

FROM node:20-alpine AS vips_clean
COPY --from=vips_builder /usr/local /usr/local
RUN apk add pkgconfig glib expat libexif jpeg libjxl openjpeg libpng tiff \
    libheif libwebp cgif imagemagick librsvg pango cfitsio poppler poppler-glib \
    libspng lcms2 fftw libimagequant
# === END VIPS ===

FROM vips_builder AS builder_stage2

RUN npm install -g pnpm node-gyp
RUN apk add python3 build-base

WORKDIR /picsur
COPY --from=builder_stage1 /picsur ./
ENV SHARP_FORCE_GLOBAL_LIBVIPS=1
RUN pnpm install --frozen-lockfile --prod

FROM vips_clean

RUN npm install -g pnpm

ARG PICSUR_VERSION=0.6.0
ENV npm_package_version=${PICSUR_VERSION}
ENV PICSUR_PRODUCTION=true

WORKDIR /picsur
COPY --from=builder_stage2 /picsur ./

CMD ["pnpm", "--filter", "picsur-backend", "start:prod"]
