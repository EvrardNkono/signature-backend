const crypto = require('crypto');

const FIREBASE_CREDENTIALS = {
  "type": "service_account",
  "project_id": "restaurant-signature-16476",
  "private_key_id": "659a51a74c4233f3dd4f341e9e91c57299db0251",
  "private_key": `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCzyZVhSl0ZgJpn
5tyjiQJaQE2k1d5bfeihq+DdBXRD23DALJk0yS95Qj+H6XbL/XaRHdnZc6thTGBy
9tfsXpOKWrhyCsLmGhUNDzbU+AuA5tuRIl+YcdNg7EXrmlVo6/PuqF/mNUyHix4C
TE0/h77qkLHrc4SikH4iHRP+ILrjSecf21qIRDo4d/7rZDo+JR488Ov9BetXFweL
eG053SeHdHuA0yq+kqCZk9Iu+P/86+I4x9GxMq71NrcegkZ2qYms+Nwbu0Uc5uBT
+dZbVovitZcOOoDx0hCh8wZ53ov7fZ4kSW6I0ja7O0vNzv4v+lIQXpX/muh3bgoP
ORQadsP7AgMBAAECggEAOjxvVzrbylF2cnZ8/Ln6GZrfq6edJZy0uH2w0lcccIiJ
zq4DmG4coxYa9x7gHLaG6/2z3bSSjGtNiJ+9lHKULwow2bvzos5LCFZnx/dq3n+p
Gqt8NKiWNDyEb4sn5Fsdwi4nFi4oknU1LMBje1Mwu9FP2HksOu479TffDH+0mb+A
QBohK6FaopNnpetvrhaDqvsYb2Ia5uORKnX8FQlaLV5BvWN88PFL/wZUT6j6V6T1
vEcBL6aLYiL+kXX6Q7orP2rb9z5hf9Hc1w/2eyPqAugnxRB4r2h+Xi95A5OAYhVl
zyi/Dmmh/cvkhbnJ0xE1rZB/MiPY/2t6wiTSj/pi3QKBgQDvKwNBjq72Xx+ujb6w
2ZLoHN5wMrhCvpKaGppTL8meBcQKUeCfSAGjcuU9TLciVezoZiVUMzyF3c+qns2o
LlRRye241LIj0MfSBYoUa9wuW2ckJK6Z7SWdlVvefqKnpHGnaa18ttKTpuKW0y+9
ApiKDfgQ+oF9ZQwMxasVePy9PwKBgQDAcLyDxk6KUXFSd1sfsv17QtX7txMKhed5
vz0ohz8GujAKM5sIZFLolhA6NdrIgs78zG7xfoUAhZn9nkZ0SKEPLghgrQv6qcBG
MijzeszFPYaf83NEs7rPBFgGByeDJbuoDDB7YNzDR09yl2H4BYHyR6FtC2GzJZNK
okklVl2+RQKBgFkS0+uekFsBonMIJ3UGE0iPN+jheu6gu0jZj5Bbw+MukoylYdrw
nmuZZvclky8egVUsdcqeKnRQ3/7TlhSE7LJpWjf0P0RHhaQanApvAVnigM9dOgnp
4JCIB+cdksaM4CdRnGNOU67aAJnbnXPve5AvE6x/H6rr70jydX1Ryg9RAoGANhZ5
pb/zC0VgyIDrh7lTLXXXluwZ2fdQ3BM4KU/6EvX50qQ2iuFHvD+RSAsi9wBtFPiQ
piedUkw6v+Hgg4Z2XkHd8O4yU72qYRBwGh8FttpYIFTYrRKnCtB5vRf9rwrH96+V
YNgUtH4ygk6yJnfF0kb3xCJSz3tcLrn2PRxNNNECgYAgIKkmIhAdBs8vCGbp5i6h
7MPaadCO+FYHtBFnYsEk5VYu7cckb9qYjaWWDNU6bHbRdsS+BbEc3i2pkh4Mw6ob
/36ozFifSE7b5wUCbEnKVbzDnF9nj7hU6wQ1i6fqbImsg2J3nuekYOn58A8t5GAN
Z0+oTZtR74GI9wLoIn7Q+g==
-----END PRIVATE KEY-----`,
  "client_email": "firebase-adminsdk-fbsvc@restaurant-signature-16476.iam.gserviceaccount.com",
  "client_id": "109227702051559712469",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40restaurant-signature-16476.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

async function testJWT() {
  const privateKey = FIREBASE_CREDENTIALS.private_key;
  
  console.log("=== TEST LOCAL ===");
  console.log("Longueur clé:", privateKey.length);
  console.log("Contient \\n:", privateKey.includes('\\n'));
  console.log("Contient newlines:", privateKey.includes('\n'));
  console.log("Début:", privateKey.substring(0, 50));
  console.log("Fin:", privateKey.substring(privateKey.length - 50));
  
  // Test JWT
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: FIREBASE_CREDENTIALS.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })).toString('base64url');

  const signingInput = `${header}.${payload}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signingInput);
  
  try {
    const signature = sign.sign(privateKey, 'base64url');
    console.log("✅ Signature JTV réussie !");
    const jwt = `${signingInput}.${signature}`;
    console.log("JWT créé, longueur:", jwt.length);
  } catch (error) {
    console.error("❌ Erreur signature:", error.message);
  }
}

testJWT();