#!/usr/bin/env bash
# Run the sh3d driver UI + TCP server. usage: ./run.sh <port>
#
# Classpath notes:
# - java3d-1.6/*.jar are PREPENDED so their javax.media.j3d classes win over
#   the duplicate (older) copies in top-level lib/*.jar.
# - jogamp.gluegen.UseTempJarCache=false is required when running from the
#   extracted distribution (see SH3D's own SweetHome3DBootstrap).
# - java.library.path points at the Java 3D linux/amd64 natives.
# - DISPLAY must point at a running X/Wayland session (e.g. :1).
set -euo pipefail
cd "$(dirname "$0")"

PORT="${1:?usage: run.sh <port>}"
JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-21-openjdk-amd64}"
SH3D_ROOT="${SH3D_ROOT:-$PWD/../../sweethome3d-7.5-wayland-patch}"

CP="classes:lib/gson-2.11.0.jar:$SH3D_ROOT/libtest/jnlp.jar:$SH3D_ROOT/build/SweetHome3D.jar"
for j in "$SH3D_ROOT"/lib/*.jar; do CP="$CP:$j"; done
for j in "$SH3D_ROOT"/lib/java3d-1.6/*.jar; do CP="$j:$CP"; done

# Runtime: must be a JDK/JRE WITH X11 AWT toolkit (libawt_xawt.so).
# openjdk-21-jre-headless lacks it -> HeadlessException in Java3D.
for cand in /usr/lib/jvm/java-21-openjdk-amd64 /usr/lib/jvm/java-17-openjdk-amd64 /usr/lib/jvm/default-java; do
  if [ -x "$cand/bin/java" ] && ls "$cand"/lib/libawt_xawt.so >/dev/null 2>&1; then
    JAVA_BIN="$cand/bin/java"
    break
  fi
done
JAVA_BIN="${JAVA_BIN:-$(command -v java)}"
if ! ls "$(dirname "$(dirname "$JAVA_BIN")")"/lib/libawt_xawt.so >/dev/null 2>&1; then
  echo "warning: $JAVA_BIN may lack libawt_xawt.so (headless-only JRE)" >&2
fi

exec "$JAVA_BIN" \
  --add-opens=java.desktop/java.awt=ALL-UNNAMED \
  --add-opens=java.desktop/sun.awt=ALL-UNNAMED \
  -Djava.library.path="$SH3D_ROOT/lib/java3d-1.6/linux/amd64" \
  -Djogamp.gluegen.UseTempJarCache=false \
  -cp "$CP" \
  com.houseequiv.driver.DriverMain --port "$PORT"
