#!/usr/bin/env bash
set -euo pipefail
# Never enable tracing: this process receives Actions secrets.
for name in CPANEL_HOST CPANEL_PORT CPANEL_USER CPANEL_SSH_KEY; do
  if [[ -z "${!name:-}" ]]; then
    echo "::error::Missing required secret: $name"; exit 1
  fi
done
[[ "$CPANEL_HOST" == buenosaires.servidoraweb.net ]]
[[ "$CPANEL_PORT" == 9022 ]]
[[ "$CPANEL_USER" == m20adminpanel ]]
test -s dist/index.html
test -s dist/styles.min.css
if find dist -type l | grep -q .; then
  echo '::error::Public output contains a symbolic link'; exit 1
fi
while IFS= read -r -d '' file; do
  case "$file" in
    dist/index.html|dist/contacto.html|dist/recursos-humanos.html|dist/404.html|dist/favicon.svg|dist/robots.txt|dist/sitemap.xml|dist/llms.txt|dist/styles.min.css|dist/app.js|dist/premium.js|dist/smooth-scroll.js|dist/forms.js|dist/.nojekyll) ;;
    dist/assets/*)
      case "$file" in
        *.webp|*.jpg|*.png|*.svg|*.woff2|*.css|*/OFL.txt|*/OFL-*.txt) ;;
        *) echo '::error::Unexpected asset in public output'; exit 1 ;;
      esac ;;
    *) echo '::error::Unexpected file in public output'; exit 1 ;;
  esac
done < <(find dist -type f -print0)
umask 077
temp_dir=$(mktemp -d)
cleanup() {
  ssh-agent -k >/dev/null 2>&1 || true
  rm -rf -- "$temp_dir"
}
trap cleanup EXIT
# Normalize copy/paste whitespace without ever printing the key.
printf '%s\n' "$CPANEL_SSH_KEY" | tr -d '\r' | sed 's/[[:blank:]]*$//; /^[[:space:]]*$/d' > "$temp_dir/key"
if ! grep -Eq '^-----BEGIN (OPENSSH |RSA |EC |ENCRYPTED )?PRIVATE KEY-----$' "$temp_dir/key"; then
  echo '::error::CPANEL_SSH_KEY must contain a multiline private key, including BEGIN/END headers (not the public key).'; exit 1
fi
cat > "$temp_dir/askpass" <<'ASKPASS'
#!/usr/bin/env bash
printf '%s\n' "${CPANEL_SSH_PASSPHRASE:-}"
ASKPASS
chmod 700 "$temp_dir/askpass"
eval "$(ssh-agent -s)" >/dev/null
export SSH_ASKPASS="$temp_dir/askpass" SSH_ASKPASS_REQUIRE=force DISPLAY=:0
ssh-add "$temp_dir/key" </dev/null >/dev/null 2>"$temp_dir/key-error" || {
  if grep -qi 'incorrect passphrase\|bad passphrase' "$temp_dir/key-error"; then
    echo '::error::CPANEL_SSH_PASSPHRASE does not unlock the private key.'
  elif grep -qi 'libcrypto\|invalid format' "$temp_dir/key-error"; then
    echo '::error::CPANEL_SSH_KEY is not a valid private key. Copy the complete original private key with real newlines.'
  else
    echo '::error::Cannot load SSH key. Check key format and passphrase.'
  fi
  exit 1
}
unset CPANEL_SSH_KEY CPANEL_SSH_PASSPHRASE
ssh_args=(-p "$CPANEL_PORT" -o BatchMode=yes -o StrictHostKeyChecking=yes
  -o "UserKnownHostsFile=$PWD/scripts/cpanel-known-hosts"
  -o HostKeyAlgorithms=ssh-ed25519 -o ConnectTimeout=20
  -o ServerAliveInterval=15 -o ServerAliveCountMax=3)
remote="$CPANEL_USER@$CPANEL_HOST"
target=/home3/m20adminpanel/public_html
ssh "${ssh_args[@]}" "$remote" \
  'test "$(realpath /home3/m20adminpanel/public_html)" = /home3/m20adminpanel/public_html && test -w /home3/m20adminpanel/public_html && command -v rsync >/dev/null && command -v sha256sum >/dev/null'
printf -v ssh_command '%q ' ssh "${ssh_args[@]}"
# No --delete: preserve .well-known, PHP and hosting-owned files.
rsync -rz --checksum --delay-updates --chmod=D755,F644 \
  -e "$ssh_command" dist/ "$remote:$target/"
(cd dist && find . -type f -print0 | sort -z | xargs -0 sha256sum) > "$temp_dir/manifest"
ssh "${ssh_args[@]}" "$remote" \
  'cd /home3/m20adminpanel/public_html && sha256sum --check --quiet' < "$temp_dir/manifest"
echo 'All generated public files deployed and SHA-256 verified on cPanel.'
