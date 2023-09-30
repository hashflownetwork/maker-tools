import { GetSecretValueCommand,SecretsManagerClient } from "@aws-sdk/client-secrets-manager"; 

export async function getSecretValue(
  secretRegion: string,
  secretName: string
): Promise<string> {
    const client = new SecretsManagerClient({region: secretRegion});

    const data = await client.send(new GetSecretValueCommand({SecretId: secretName}));
    if ('SecretString' in data && data.SecretString) {
        return data.SecretString;
    } else {
        throw new Error(`Binary secrets not supported`);
    } 
}
