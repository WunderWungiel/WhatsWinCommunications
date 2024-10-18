using System;
using System.Net.Http;
using System.Reflection.Metadata;
using System.Runtime.CompilerServices;
using System.Security.Cryptography;
using System.Text;

class Program
{
    private static readonly HttpClient client = new HttpClient();
    private static string sessionId;
    private static readonly byte[] aesKey = new byte[32]; // 256-bit key
    private static readonly string baseUrl = "http://localhost:5000";
    private static byte[] ConcatenateByteArrays(byte[] a, byte[] b)
    {
        byte[] result = new byte[a.Length + b.Length];
        Buffer.BlockCopy(a, 0, result, 0, a.Length);
        Buffer.BlockCopy(b, 0, result, a.Length, b.Length);
        return result;
    }
    private static StringContent PrepareContent(string sessionId, byte[] data = null)
    {
        string base64;
        StringContent content;
        if (data == null)
        {
            base64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(sessionId));
            content = new StringContent(base64, Encoding.UTF8, "application/octet-stream");
            return content;
        }

        base64 = Convert.ToBase64String(ConcatenateByteArrays(Encoding.UTF8.GetBytes(sessionId), data));
        content = new StringContent(base64, Encoding.UTF8, "application/octet-stream");
        return content;
    }
    static void Main(string[] args)
    {

        using (var client = new HttpClient())
        {
            // Generate Session ID
            HttpResponseMessage response = client.GetAsync("http://localhost:5000/generateSessionId").Result;
            string sessionId = response.Content.ReadAsStringAsync().Result;
            Console.WriteLine("Session ID: " + sessionId);

            // Prepare headers and data
            client.DefaultRequestHeaders.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/octet-stream"));

            // Get Public Key
            response = client.PostAsync("http://localhost:5000/privacy/getPublicKey", PrepareContent(sessionId)).Result;
            string publicKeyPem = response.Content.ReadAsStringAsync().Result;

            Console.WriteLine("Key received: " + publicKeyPem);
            using (var rsa = RSA.Create())
            {
                rsa.ImportFromPem(publicKeyPem.ToCharArray());

                // Generate AES key
                using (var rng = RandomNumberGenerator.Create())
                {
                    rng.GetBytes(aesKey);
                }

                // Encrypt AES key with public key
                var encryptedAesKey = rsa.Encrypt(aesKey, RSAEncryptionPadding.OaepSHA256);

                response = client.PostAsync("http://localhost:5000/privacy/sendSymmetricalKey", PrepareContent(sessionId, encryptedAesKey)).Result;
                Console.WriteLine(response.Content.ReadAsStringAsync().Result);
            }
        }
    }
    
}
