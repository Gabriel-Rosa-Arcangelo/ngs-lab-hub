from __future__ import annotations

import boto3
from botocore.config import Config
from django.conf import settings

def s3_client(endpoint_url: str | None = None):
    return boto3.client(
        "s3",
        aws_access_key_id=settings.S3_ACCESS_KEY_ID,
        aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
        region_name=settings.S3_REGION,
        endpoint_url=endpoint_url or settings.S3_ENDPOINT_URL or None,
        config=Config(signature_version="s3v4"),
    )

def put_bytes(bucket: str, key: str, data: bytes, content_type: str):
    s3_client().put_object(Bucket=bucket, Key=key, Body=data, ContentType=content_type)


def put_file(bucket: str, key: str, file_path: str, content_type: str):
    with open(file_path, "rb") as file_obj:
        s3_client().upload_fileobj(
            Fileobj=file_obj,
            Bucket=bucket,
            Key=key,
            ExtraArgs={"ContentType": content_type},
        )


def delete_object(bucket: str, key: str):
    s3_client().delete_object(Bucket=bucket, Key=key)


def presign_get(bucket: str, key: str, expires: int) -> str:
    presign_endpoint = settings.S3_PRESIGN_ENDPOINT_URL or settings.S3_ENDPOINT_URL
    return s3_client(endpoint_url=presign_endpoint or None).generate_presigned_url(
        ClientMethod="get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=expires,
    )
