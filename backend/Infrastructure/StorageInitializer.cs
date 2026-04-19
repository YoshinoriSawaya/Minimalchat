using Amazon.S3;
using Amazon.S3.Model;

namespace MinimalChat.Backend.Infrastructure;

public class StorageInitializer
{
    private readonly IAmazonS3 _s3Client;
    private const string BucketName = "minimal-chat-images";

    public StorageInitializer(IAmazonS3 s3Client)
    {
        _s3Client = s3Client;
    }

    public async Task InitializeVolatilityPolicyAsync()
    {
        try
        {
            var bucketExists = await Amazon.S3.Util.AmazonS3Util.DoesS3BucketExistV2Async(_s3Client, BucketName);
            if (!bucketExists)
            {
                await _s3Client.PutBucketAsync(BucketName);
            }

            var lifecycleConfig = new LifecycleConfiguration
            {
                Rules = new List<LifecycleRule>
                {
                    new LifecycleRule
                    {
                        Id = "AutoDeleteAfterOneDay",
                        Filter = new LifecycleFilter(),
                        Status = LifecycleRuleStatus.Enabled,
                        Expiration = new LifecycleRuleExpiration { Days = 1 }
                    }
                }
            };

            await _s3Client.PutLifecycleConfigurationAsync(new PutLifecycleConfigurationRequest
            {
                BucketName = BucketName,
                Configuration = lifecycleConfig
            });

            Console.WriteLine($"[Storage] Lifecycle policy applied to {BucketName}.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Storage Error] Failed to apply lifecycle policy: {ex.Message}");
        }
    }
}