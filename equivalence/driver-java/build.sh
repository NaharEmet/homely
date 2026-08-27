#!/usr/bin/env bash
# Build the sh3d driver. Requires JDK 21 (javac --release 21).
set -euo pipefail
cd "$(dirname "$0")"

# Compiler: newest JDK with javac (this box ships JDK 17 + JRE 21 only).
if [ -z "${JAVA_HOME:-}" ] || [ ! -x "$JAVA_HOME/bin/javac" ]; then
  for candidate in /usr/lib/jvm/java-21-openjdk-amd64 /usr/lib/jvm/java-17-openjdk-amd64; do
    if [ -x "$candidate/bin/javac" ]; then JAVA_HOME="$candidate"; break; fi
  done
fi
JAVA_HOME="${JAVA_HOME:-}"
RELEASE=17

SH3D_ROOT="${SH3D_ROOT:-$PWD/../../sweethome3d-7.5-wayland-patch}"

JARS="$SH3D_ROOT/build/SweetHome3D.jar"
for j in "$SH3D_ROOT"/lib/java3d-1.6/*.jar; do JARS="$JARS:$j"; done

rm -rf classes
mkdir -p classes

"$JAVA_HOME/bin/javac" --release "$RELEASE" \
  -cp "lib/gson-2.11.0.jar:$JARS" \
  -d classes \
  $(find src -name '*.java')

# Bundle SH3D's furniture catalog data (GPL, part of the SH3D-derived driver)
# so the live catalog is non-empty. build/SweetHome3D.jar ships without these
# resources; they live under SH3D_ROOT/src/..../io/ and load off the classpath
# via ResourceBundle.getBundle("com.eteks.sweethome3d.io.DefaultFurnitureCatalog").
mkdir -p classes/com/eteks/sweethome3d/io
cp "$SH3D_ROOT/src/com/eteks/sweethome3d/io/DefaultFurnitureCatalog"*.properties \
   classes/com/eteks/sweethome3d/io/
cp -r "$SH3D_ROOT/src/com/eteks/sweethome3d/io/resources" \
   classes/com/eteks/sweethome3d/io/

echo "built $(find classes -name '*.class' | wc -l) classes"
