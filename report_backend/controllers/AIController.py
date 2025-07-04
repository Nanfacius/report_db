from pdfminer.high_level import extract_text
import io
from openai import OpenAI
from dotenv import load_dotenv
import os
from sqlalchemy import create_engine, text

load_dotenv()
OPENAI_URL = os.getenv("OPENAI_URL")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")

client = OpenAI(
    base_url=OPENAI_URL,  # 替换为你的服务地址（如 LMStudio 默认为 http://localhost:1234/v1）
    api_key=OPENAI_API_KEY  # 本地服务通常不需要真实密钥
)
# 创建数据库引擎
engine = create_engine(f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}?charset=utf8mb4")

def extract_with_pdfminer(pdf_content: bytes) -> str:
    """使用pdfminer提取文本（保留布局）"""
    return extract_text(io.BytesIO(pdf_content))

def chat(question):
    """向 GPT 模型提问并获取回答"""
    try:
        response = client.chat.completions.create(
            model="qwen-turbo-latest",
            messages=[
                {"role": "system", "content": "你是一个pdf转文本工具，你的任务是把用户从pdf上直接复制给你的格式混乱的文字整理成一篇文本文档，调整排版，理顺逻辑，删除与主要内容无关的字符，修正因pdf排版问题导致的语义混乱，并删除可能不被sql数据库支持的特殊字符。只需返回结果，不要做任何说明。"},
                {"role": "user", "content": question}
            ],
            stream=False
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"发生错误: {str(e)}"

def main():
    with engine.connect() as conn:
        sql = text(f"""
            SELECT id,url FROM reports WHERE content = "";
        """)
        result = conn.execute(sql)
    for row in result.all():
        file_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), 
            "uploads", 
            os.path.basename(row.url)
        )
        
        # 添加文件存在性检查
        if not os.path.exists(file_path):
            print(f"文件不存在: {file_path}")
            continue
            
        try:
            with open(file_path, 'rb') as f:
                pdf_content = f.read()
            
            content_raw = extract_with_pdfminer(pdf_content)
            print(content_raw)
            # content = chat(content_raw)  # 确保返回字符串
            content = content_raw
            
            # 使用参数化查询解决所有问题
            with engine.connect() as conn:
                # 使用参数化查询
                sql = text("UPDATE reports SET content = :content, content_short = :content_short WHERE id = :id")
                
                # 执行时传递参数
                conn.execute(sql, {"content": content, "content_short": content[:1024], "id": row.id})
                conn.commit()
                
        except Exception as e:
            print(f"处理行 {row.id} 时出错: {str(e)}")
            # 添加错误处理逻辑（如记录日志、跳过等）
if __name__=="__main__":
    main()

