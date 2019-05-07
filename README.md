# Cloudflare to Cloudwatch
Stream Cloudflare ELS logs into CloudWatch

## Setup
1. [In CloudWatch under *Logs*](https://console.aws.amazon.com/cloudwatch/home#logs:), create a new group, `cloudflare-group` and a new stream, `cloudflare-log-stream`
2. [On the policies page](https://console.aws.amazon.com/iam/home#/policies$new?step=edit), create this policy:
```js
// Name this policy "cloudflare-logs-policy".
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "logs:DescribeLogStreams"
            ],
            "Resource": "*"
        }
    ]
}
```
3. Create a new role named `cloudflare-logs-role` and assign `cloudflare-logs-policy` to it.
4. Modify the runtime environment variables in `config/default.yml`:
```yaml
# default.yml
region: 'us-east-1'

# ...

schedule:
  name: 'fiveminutes'
  expression: 'rate(5 minutes)'

lambda:
    # Update this with the role you created in step 3
    role: 'arn:aws:iam::123456789012:policy/cloudflare-logs-role'
# ...

# In Cloudflare, retrieve your Global API Key (https://dash.cloudflare.com/profile)
# and your org ID: `https://dash.cloudflare.com/..MY_ACCOUNT_KEY../example.com
runtime:
  # you can define the interval for polling new logs. You'll need to change the interval below 
  # and the schedule expression above. interval must match the rate defined in schedule.expression.
  # For example, for 'rate(5 minutes)', interval is 5
  interval: 5
  cf:
    authKey: CF_AUTH_KEY
    authEmail: CF_EMAIL
    orgId: CF_ORG_ID
```

## Deploy
> Note that you must have the AWS CLI configured to complete this deployment
```sh
# Install local dependencies
npm install -g gulp && npm install
```

```sh
# Deploy to lambda
npm run deploy
```
